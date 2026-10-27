import { LlmAnalysisSchema, type LlmAnalysis } from '@confinet/core';
import {
  buildPrompt,
  INSTRUCTIONS,
  jsonOnlySuffix,
  parseJsonLoose,
  type ArticleInput,
} from '@confinet/llm/prompt';
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
    throw new Error(
      snippet
        ? `El modelo respondió sin JSON: "${snippet}…"`
        : 'El modelo devolvió una respuesta vacía.',
    );
  }
  const parsed = LlmAnalysisSchema.safeParse(json);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .slice(0, 2)
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`El modelo no devolvió un análisis válido (${detail}).`);
  }
  return parsed.data;
}

export async function runAi(settings: AiSettings, article: ArticleInput): Promise<LlmAnalysis> {
  if (!settings.model) throw new Error('No hay modelo elegido.');
  if (settings.provider === 'puter') return runPuter(settings.model, article);
  if (settings.provider === 'ollama-cloud') {
    if (!settings.ollamaKey) throw new Error('Falta la API key de Ollama.');
    return runOllama(settings.model, settings.ollamaKey, article);
  }
  throw new Error('No hay proveedor de IA elegido.');
}

// ── Puter ────────────────────────────────────────────────────────────────────
async function runPuter(model: string, article: ArticleInput): Promise<LlmAnalysis> {
  const puter = await loadPuter();
  const messages = [
    { role: 'system', content: INSTRUCTIONS },
    { role: 'user', content: buildPrompt(article) },
  ];
  const chat = (extra: Record<string, unknown>, sys = INSTRUCTIONS) =>
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
    const res = await chat({}, INSTRUCTIONS + jsonOnlySuffix(SCHEMA));
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
  throw new Error('Respuesta vacía del modelo.');
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
      throw new Error(
        'El navegador bloqueó la conexión directa con Ollama. Inicia sesión en Puter para enviarla a través de su proxy.',
        { cause: error },
      );
    }
    res = await puterFetch(`${OLLAMA_URL}${path}`, req);
  }
  if (res.status === 401) throw new Error('Ollama rechazó la API key (401). Revísala en Cuenta.');
  if (res.status === 402 || res.status === 429) {
    throw new Error(`Ollama no aceptó la petición (${res.status}): revisa tu saldo o límite.`);
  }
  if (!res.ok) throw new Error(`Error de Ollama (${res.status}).`);
  return res;
}

interface OllamaChat {
  message?: { content?: string; thinking?: string };
  done_reason?: string;
}

async function runOllama(model: string, key: string, article: ArticleInput) {
  const chat = async (extra: Record<string, unknown>, sys = INSTRUCTIONS) => {
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
    return parseOllama(await chat({}, INSTRUCTIONS + jsonOnlySuffix(SCHEMA)));
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
      throw new Error(
        'La respuesta del modelo se cortó antes de terminar. Prueba con otro modelo.',
        {
          cause: error,
        },
      );
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
