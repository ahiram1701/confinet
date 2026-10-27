/**
 * Ajustes de IA del modo estático. Viven solo en este navegador (localStorage):
 * la key de Ollama nunca sale de aquí salvo hacia el propio proveedor.
 *
 * No hay proveedor ni modelo por defecto: sin elección del usuario, no se usa IA.
 */
export type AiProvider = 'none' | 'puter' | 'ollama-cloud';

export interface AiSettings {
  provider: AiProvider;
  model?: string;
  /** Se conserva aunque se elija otro proveedor, para no tener que pegarla de nuevo. */
  ollamaKey?: string;
  /** Último modelo elegido con cada proveedor. */
  models?: Partial<Record<Exclude<AiProvider, 'none'>, string>>;
}

const KEY = 'confinet:ai';

export function getAiSettings(): AiSettings {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as AiSettings) : null;
    if (parsed && ['none', 'puter', 'ollama-cloud'].includes(parsed.provider)) return parsed;
  } catch {
    // almacenamiento bloqueado o corrupto: sin IA
  }
  return { provider: 'none' };
}

export function saveAiSettings(settings: AiSettings) {
  if (settings.provider !== 'none' && !settings.model) {
    throw new Error('Elige un modelo antes de guardar.');
  }
  if (settings.provider === 'ollama-cloud' && !settings.ollamaKey) {
    throw new Error('Pega tu API key de Ollama.');
  }
  const previous = getAiSettings();
  const ollamaKey = settings.ollamaKey || previous.ollamaKey;
  const models = { ...previous.models };
  if (settings.provider !== 'none') models[settings.provider] = settings.model;
  const clean: AiSettings = {
    provider: settings.provider,
    ...(settings.provider !== 'none' ? { model: settings.model } : {}),
    ...(ollamaKey ? { ollamaKey } : {}),
    ...(Object.keys(models).length ? { models } : {}),
  };
  localStorage.setItem(KEY, JSON.stringify(clean));
}

/** Borra la key de Ollama de este navegador (y deja de usar Ollama si era el proveedor). */
export function forgetOllamaKey() {
  const next = getAiSettings();
  delete next.ollamaKey;
  if (next.provider === 'ollama-cloud') {
    next.provider = 'none';
    delete next.model;
  }
  localStorage.setItem(KEY, JSON.stringify(next));
}

/** ¿Está la IA lista para usarse? */
export function isAiConfigured(s: AiSettings = getAiSettings()): boolean {
  return s.provider !== 'none' && !!s.model && (s.provider !== 'ollama-cloud' || !!s.ollamaKey);
}
