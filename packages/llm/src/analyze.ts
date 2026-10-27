import { LlmAnalysisSchema, type LlmAnalysis } from '@confinet/core';
import { generateText, Output, type LanguageModel } from 'ai';
import { z } from 'zod';
import type { LlmConfig } from './config';
import {
  buildPrompt,
  INSTRUCTIONS,
  jsonOnlySuffix,
  parseJsonLoose,
  type ArticleInput,
} from './prompt';
import { createModel } from './providers';

export interface LlmResult {
  analysis: LlmAnalysis;
  provider: string;
  model: string;
  /** Intentos fallidos previos en la cadena (útil para logs). */
  failures: { provider: string; model: string; error: string }[];
}

export class LlmChainError extends Error {
  constructor(public failures: LlmResult['failures']) {
    super(
      failures.length === 0
        ? 'No hay ningún proveedor LLM configurado'
        : `Todos los proveedores LLM fallaron: ${failures.map((f) => `${f.provider} (${f.error})`).join('; ')}`,
    );
    this.name = 'LlmChainError';
  }
}

export interface AnalyzeOptions {
  /** Inyectable para tests. */
  modelFactory?: (config: LlmConfig) => LanguageModel;
  abortSignal?: AbortSignal;
}

/**
 * Recorre la cadena de proveedores hasta que uno devuelve un análisis válido.
 * Un fallo (rate limit, timeout, JSON inválido) pasa al siguiente proveedor.
 */
export async function analyzeWithLlm(
  chain: LlmConfig[],
  article: ArticleInput,
  options: AnalyzeOptions = {},
): Promise<LlmResult> {
  const failures: LlmResult['failures'] = [];
  const factory = options.modelFactory ?? createModel;

  for (const config of chain) {
    try {
      const analysis =
        config.provider === 'mock'
          ? mockAnalysis(article)
          : await runModel(
              factory(config),
              article,
              config.timeoutMs ?? 30_000,
              options.abortSignal,
            );
      return { analysis, provider: config.provider, model: config.model, failures };
    } catch (error) {
      failures.push({
        provider: config.provider,
        model: config.model,
        error: error instanceof Error ? error.message.slice(0, 300) : String(error),
      });
    }
  }
  throw new LlmChainError(failures);
}

async function runModel(
  model: LanguageModel,
  article: ArticleInput,
  timeoutMs: number,
  abortSignal?: AbortSignal,
): Promise<LlmAnalysis> {
  const signal = abortSignal
    ? AbortSignal.any([abortSignal, AbortSignal.timeout(timeoutMs)])
    : AbortSignal.timeout(timeoutMs);
  const prompt = buildPrompt(article);

  // 1) Salida estructurada nativa (tool use / json_schema según el proveedor).
  try {
    const { output } = await generateText({
      model,
      instructions: INSTRUCTIONS,
      prompt,
      output: Output.object({ schema: LlmAnalysisSchema, name: 'analisis_fiabilidad' }),
      temperature: 0,
      maxRetries: 1,
      abortSignal: signal,
    });
    return LlmAnalysisSchema.parse(output);
  } catch (error) {
    if (signal.aborted) throw error;
    // 2) Modelos sin salida estructurada: pedimos JSON en el prompt y validamos nosotros.
    return runJsonFallback(model, prompt, signal);
  }
}

async function runJsonFallback(
  model: LanguageModel,
  prompt: string,
  signal: AbortSignal,
): Promise<LlmAnalysis> {
  const instructions = INSTRUCTIONS + jsonOnlySuffix(z.toJSONSchema(LlmAnalysisSchema));
  let lastError = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const { text } = await generateText({
      model,
      instructions,
      prompt:
        attempt === 0
          ? prompt
          : `${prompt}\n\nTu respuesta anterior no era válida: ${lastError}. Corrígela.`,
      temperature: 0,
      maxRetries: 0,
      abortSignal: signal,
    });
    const parsed = LlmAnalysisSchema.safeParse(parseJsonLoose(text));
    if (parsed.success) return parsed.data;
    lastError = parsed.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
  }
  throw new Error(`Respuesta JSON inválida: ${lastError}`);
}

/** Análisis determinista para tests, CI y desarrollo sin claves. */
export function mockAnalysis(article: ArticleInput): LlmAnalysis {
  const sensational = /[!¡]{2,}|impactante|incre[íi]ble|shocking/i.test(
    `${article.title} ${article.text}`,
  );
  return {
    tone: sensational ? 'sensationalist' : 'neutral',
    fallacies: [],
    claims: [],
    summary: article.title,
    assessment: sensational ? 30 : 75,
    reasoning: '[mock] Análisis simulado sin modelo real.',
  };
}
