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
  ollamaKey?: string;
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
  // Solo guardamos la key si el proveedor la usa.
  const clean: AiSettings =
    settings.provider === 'none'
      ? { provider: 'none' }
      : settings.provider === 'puter'
        ? { provider: 'puter', model: settings.model }
        : settings;
  localStorage.setItem(KEY, JSON.stringify(clean));
}

/** ¿Está la IA lista para usarse? */
export function isAiConfigured(s: AiSettings = getAiSettings()): boolean {
  return s.provider !== 'none' && !!s.model && (s.provider !== 'ollama-cloud' || !!s.ollamaKey);
}
