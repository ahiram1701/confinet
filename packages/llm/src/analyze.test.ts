import { MockLanguageModelV4 } from 'ai/test';
import { describe, expect, it } from 'vitest';
import { analyzeWithLlm, LlmChainError } from './analyze';
import { parseJsonLoose } from './prompt';
import { chainFromEnv, type LlmConfig } from './config';

const article = { url: 'https://a.example/x', title: 'Titular', text: 'Texto del artículo.' };

const validJson = JSON.stringify({
  tone: 'neutral',
  fallacies: [],
  claims: [{ text: 'X', verifiable: true, sourced: true }],
  summary: 'Resumen',
  assessment: 80,
  reasoning: 'Cita fuentes.',
});

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 10, text: 10, reasoning: 0 },
};

function modelReturning(text: string) {
  return new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: 'text', text }],
      finishReason: { unified: 'stop', raw: 'stop' },
      usage,
      warnings: [],
    }),
  });
}

function failingModel(message: string) {
  return new MockLanguageModelV4({
    doGenerate: async () => {
      throw new Error(message);
    },
  });
}

const cfg = (provider: LlmConfig['provider'], model = 'm'): LlmConfig => ({ provider, model });

describe('analyzeWithLlm', () => {
  it('devuelve un análisis validado con el contrato común', async () => {
    const result = await analyzeWithLlm([cfg('openai')], article, {
      modelFactory: () => modelReturning(validJson),
    });
    expect(result.analysis.assessment).toBe(80);
    expect(result.provider).toBe('openai');
  });

  it('salta al siguiente proveedor si el primero falla', async () => {
    const result = await analyzeWithLlm([cfg('google'), cfg('groq')], article, {
      modelFactory: (c) =>
        c.provider === 'google' ? failingModel('429 rate limit') : modelReturning(validJson),
    });
    expect(result.provider).toBe('groq');
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]?.error).toContain('429');
  });

  it('acepta JSON envuelto en markdown (modelos sin salida estructurada)', async () => {
    const result = await analyzeWithLlm([cfg('ollama')], article, {
      modelFactory: () => modelReturning('Aquí tienes:\n```json\n' + validJson + '\n```'),
    });
    expect(result.analysis.tone).toBe('neutral');
  });

  it('lanza LlmChainError si todos fallan', async () => {
    await expect(
      analyzeWithLlm([cfg('openai'), cfg('anthropic')], article, {
        modelFactory: () => modelReturning('no es json'),
      }),
    ).rejects.toBeInstanceOf(LlmChainError);
  });

  it('el proveedor mock funciona sin red', async () => {
    const result = await analyzeWithLlm([cfg('mock')], { ...article, title: '¡¡IMPACTANTE!!' });
    expect(result.analysis.tone).toBe('sensationalist');
  });
});

describe('chainFromEnv', () => {
  it('construye primario + respaldos con sus claves', () => {
    const chain = chainFromEnv({
      LLM_PROVIDER: 'google',
      LLM_MODEL: 'gemini-x',
      LLM_API_KEY: 'k1',
      LLM_FALLBACKS: 'groq:llama-x, workers-ai:@cf/meta/llama, ollama-cloud:gpt-oss:120b',
      GROQ_API_KEY: 'k2',
      CLOUDFLARE_AI_TOKEN: 'k3',
      CLOUDFLARE_ACCOUNT_ID: 'acc',
      OLLAMA_API_KEY: 'k4',
    });
    expect(chain.map((c) => c.provider)).toEqual(['google', 'groq', 'workers-ai', 'ollama-cloud']);
    expect(chain[1]).toMatchObject({ model: 'llama-x', apiKey: 'k2' });
    expect(chain[2]?.baseUrl).toContain('/accounts/acc/ai/v1');
    // Los nombres de modelo de Ollama llevan ":" (gpt-oss:120b) y deben conservarse.
    expect(chain[3]).toMatchObject({ model: 'gpt-oss:120b', apiKey: 'k4' });
  });

  it('sin LLM_PROVIDER no hay IA (ningún proveedor por defecto)', () => {
    expect(chainFromEnv({})).toEqual([]);
  });

  it('exige el modelo: no hay modelos por defecto', () => {
    expect(() => chainFromEnv({ LLM_PROVIDER: 'anthropic' })).toThrow(/LLM_MODEL/);
    expect(() => chainFromEnv({ LLM_PROVIDER: 'mock', LLM_FALLBACKS: 'ollama-cloud' })).toThrow(
      /ollama-cloud:<modelo>/,
    );
  });

  it('rechaza proveedores desconocidos', () => {
    expect(() => chainFromEnv({ LLM_PROVIDER: 'skynet' })).toThrow();
  });

  it('parseJsonLoose ignora texto alrededor', () => {
    expect(parseJsonLoose('bla {"a":1} bla')).toEqual({ a: 1 });
  });
});
