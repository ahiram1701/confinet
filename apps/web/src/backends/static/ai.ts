import { LlmAnalysisSchema, type LlmAnalysis } from '@confinet/core';
import {
  buildInstructions,
  buildPrompt,
  jsonOnlySuffix,
  parseJsonLoose,
  type ArticleInput,
} from '@confinet/llm/prompt';
import { AppError } from '@confinet/i18n';
import { z } from 'zod';
import { isPuterSignedIn, loadPuter, puterFetch } from './puter';
import type { AiSettings } from './settings';

const OLLAMA_URL = 'https://ollama.com';
const SCHEMA = z.toJSONSchema(LlmAnalysisSchema);

export interface ModelOption {
  id: string;
  label: string;
  group?: string;
}

/** Valida la respuesta del modelo con el contrato común (el mismo que usa la API). */
export function parseAnalysis(text: string): LlmAnalysis {
  const json = parseJsonLoose(text);
  if (json === null) {
    // Mostramos el principio de la respuesta: es lo que permite saber qué hizo el modelo.
    const snippet = text.trim().replace(/\s+/g, ' ').slice(0, 120);
    throw snippet ? new AppError('error.ai.noJson', { snippet }) : new AppError('error.ai.empty');
  }
  const parsed = LlmAnalysisSchema.safeParse(json);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .slice(0, 2)
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new AppError('error.ai.invalid', { detail });
  }
  return parsed.data;
}

export async function runAi(settings: AiSettings, article: ArticleInput): Promise<LlmAnalysis> {
  if (!settings.model) throw new AppError('error.ai.noModel');
  if (settings.provider === 'puter') return runPuter(settings.model, article);
  if (settings.provider === 'ollama-cloud') {
    if (!settings.ollamaKey) throw new AppError('error.ai.noOllamaKey');
    return runOllama(settings.model, settings.ollamaKey, article);
  }
  throw new AppError('error.ai.noProvider');
}

// ── Puter ────────────────────────────────────────────────────────────────────
async function runPuter(model: string, article: ArticleInput): Promise<LlmAnalysis> {
  const puter = await loadPuter();
  const messages = [
    { role: 'system', content: buildInstructions(article.locale) },
    { role: 'user', content: buildPrompt(article) },
  ];
  const chat = (extra: Record<string, unknown>, sys = buildInstructions(article.locale)) =>
    puter.ai.chat(
      [{ ...messages[0]!, content: sys }, messages[1]!] as never,
      {
        model,
        temperature: 0,
        normalize: true,
        ...extra,
      } as never,
    ) as Promise<{ message?: { content?: unknown } }>;

  try {
    // Salida estructurada si el modelo la admite…
    const res = await chat({
      outputFormat: { type: 'json_schema', schema: SCHEMA, name: 'analisis_fiabilidad' },
    });
    return parseAnalysis(contentText(res));
  } catch {
    // …si no, pedimos el JSON en el propio prompt.
    const res = await chat({}, buildInstructions(article.locale) + jsonOnlySuffix(SCHEMA));
    return parseAnalysis(contentText(res));
  }
}

function contentText(res: { message?: { content?: unknown } }): string {
  const content = res.message?.content;
  if (typeof content === 'string') return content;
  // Formato nativo de Anthropic: array de bloques { type: 'text', text }.
  if (Array.isArray(content)) {
    return content.map((b) => (typeof b?.text === 'string' ? b.text : '')).join('');
  }
  throw new AppError('error.ai.empty');
}

export async function listPuterModels(): Promise<ModelOption[]> {
  const puter = await loadPuter();
  const models = (await puter.ai.listModels()) as {
    id: string;
    provider?: string;
    name?: string;
  }[];
  return models
    .map((m) => ({ id: m.id, label: m.name ?? m.id, group: m.provider }))
    .sort((a, b) => (a.group ?? '').localeCompare(b.group ?? '') || a.label.localeCompare(b.label));
}

// ── Ollama Cloud ─────────────────────────────────────────────────────────────
/**
 * Llama a la API nativa de Ollama Cloud. Si el navegador bloquea la petición (CORS) y hay
 * sesión de Puter, se reintenta a través de puter.net.fetch.
 */
async function ollamaFetch(path: string, key: string, init: RequestInit = {}): Promise<Response> {
  const req: RequestInit = {
    ...init,
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
  };
  let res: Response;
  try {
    res = await fetch(`${OLLAMA_URL}${path}`, req);
  } catch (error) {
    if (!(await isPuterSignedIn())) {
      throw new AppError('error.ollama.cors', undefined, { cause: error });
    }
    res = await puterFetch(`${OLLAMA_URL}${path}`, req);
  }
  if (res.status === 401) throw new AppError('error.ollama.unauthorized');
  if (res.status === 402 || res.status === 429) {
    throw new AppError('error.ollama.limit', { status: res.status });
  }
  if (!res.ok) throw new AppError('error.ollama.http', { status: res.status });
  return res;
}

interface OllamaChat {
  message?: { content?: string; thinking?: string };
  done_reason?: string;
}

async function runOllama(model: string, key: string, article: ArticleInput) {
  const chat = async (extra: Record<string, unknown>, sys = buildInstructions(article.locale)) => {
    const res = await ollamaFetch('/api/chat', key, {
      method: 'POST',
      body: JSON.stringify({
        model,
        stream: false,
        ...extra,
        // Margen de sobra: los modelos que «piensan» gastan tokens antes de responder.
        options: { temperature: 0, num_predict: 4096 },
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: buildPrompt(article) },
        ],
      }),
    });
    return (await res.json()) as OllamaChat;
  };

  // Salida estructurada con el schema…
  const first = await chat({ format: SCHEMA });
  try {
    return parseOllama(first);
  } catch {
    // …y si el modelo la ignora (pasa con varios modelos que razonan), el JSON se pide en el prompt.
    return parseOllama(await chat({}, buildInstructions(article.locale) + jsonOnlySuffix(SCHEMA)));
  }
}

/** El JSON suele venir en `content`, pero algunos modelos lo dejan en `thinking`. */
function parseOllama(data: OllamaChat): LlmAnalysis {
  const content = data.message?.content ?? '';
  const thinking = data.message?.thinking ?? '';
  try {
    return parseAnalysis(content);
  } catch (error) {
    if (thinking && parseJsonLoose(thinking) !== null) return parseAnalysis(thinking);
    if (data.done_reason === 'length') {
      throw new AppError('error.ai.truncated', undefined, { cause: error });
    }
    throw error;
  }
}

export async function listOllamaModels(key: string): Promise<ModelOption[]> {
  const res = await ollamaFetch('/api/tags', key);
  const data = (await res.json()) as { models?: { name: string }[] };
  return (data.models ?? [])
    .map((m) => ({ id: m.name, label: m.name }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
