import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { createMistral } from '@ai-sdk/mistral';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';
import type { LlmConfig } from './config';

/**
 * Crea el modelo del AI SDK para cualquier proveedor soportado.
 * Ollama, OpenRouter, Workers AI, LM Studio, vLLM, Together... hablan el protocolo de OpenAI,
 * así que comparten el adaptador `openai-compatible`.
 */
export function createModel(config: LlmConfig): LanguageModel {
  const { provider, model, apiKey, baseUrl } = config;
  switch (provider) {
    case 'anthropic':
      return createAnthropic({ apiKey, baseURL: baseUrl })(model);
    case 'openai':
      return createOpenAI({ apiKey, baseURL: baseUrl })(model);
    case 'google':
      return createGoogleGenerativeAI({ apiKey, baseURL: baseUrl })(model);
    case 'mistral':
      return createMistral({ apiKey, baseURL: baseUrl })(model);
    case 'groq':
      return createGroq({ apiKey, baseURL: baseUrl })(model);
    case 'openrouter':
      return compatible('openrouter', baseUrl ?? 'https://openrouter.ai/api/v1', apiKey, model);
    case 'workers-ai':
      if (!baseUrl) throw new Error('workers-ai necesita CLOUDFLARE_ACCOUNT_ID o LLM_BASE_URL');
      return compatible('workers-ai', baseUrl, apiKey, model);
    case 'ollama':
      return compatible('ollama', baseUrl ?? 'http://localhost:11434/v1', apiKey, model);
    case 'ollama-cloud':
      // Modelos en la nube de Ollama (de pago por token): https://ollama.com/settings/keys
      if (!apiKey) throw new Error('ollama-cloud necesita OLLAMA_API_KEY');
      return compatible('ollama-cloud', baseUrl ?? 'https://ollama.com/v1', apiKey, model);
    case 'openai-compatible':
      if (!baseUrl) throw new Error('openai-compatible necesita LLM_BASE_URL');
      return compatible('openai-compatible', baseUrl, apiKey, model);
    case 'mock':
      throw new Error('El proveedor "mock" no usa un modelo real');
  }
}

function compatible(name: string, baseURL: string, apiKey: string | undefined, model: string) {
  return createOpenAICompatible({ name, baseURL, apiKey, supportsStructuredOutputs: true })(model);
}
