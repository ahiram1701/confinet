import { ApiError, type httpApi, type Me } from '../http';
import { NeedsPuterError } from './puter';
import * as store from './store';

const unsupported = (): never => {
  throw new ApiError(501, 'not_available', 'No disponible en la versión sin servidor.');
};

/**
 * Backend «sin servidor» (GitHub Pages): misma interfaz que la API HTTP para que las
 * pantallas no cambien. Todo ocurre en el navegador; lo que requiere servidor no existe.
 */
export const staticApi: typeof httpApi = {
  config: async () => ({ devLogin: false, oauth: { google: false, github: false } }),
  me: async (): Promise<Me> => ({
    user: null,
    usage: store.todayUsage(),
    limits: { analyses: Number.POSITIVE_INFINITY, ai: Number.POSITIVE_INFINITY },
    llm: null,
  }),
  analyze: async (body) => {
    try {
      // Readability, la extracción y la IA solo se descargan al analizar por primera vez.
      const { analyzeInBrowser } = await import('./analyze');
      return await analyzeInBrowser(body);
    } catch (error) {
      if (error instanceof NeedsPuterError) throw new ApiError(428, 'needs_puter', error.message);
      throw new ApiError(
        400,
        'analyze_failed',
        error instanceof Error ? error.message : String(error),
      );
    }
  },
  analysis: async (id) => {
    const result = store.getResult(id);
    if (!result) {
      throw new ApiError(404, 'not_found', 'Este análisis no está guardado en este navegador.');
    }
    return result;
  },
  history: async () => ({ items: store.getHistory(), nextBefore: null }),
  deleteHistory: async (id) => store.deleteHistoryItem(id),
  clearHistory: async () => store.clearHistory(),
  feedback: async () => unsupported(),
  providers: async () => [],
  saveLlm: async () => unsupported(),
  deleteLlm: async () => unsupported(),
  createExtensionToken: async () => unsupported(),
  extensionTokens: async () => [],
  revokeExtensionToken: async () => unsupported(),
  admin: {
    feedback: async () => unsupported(),
    resolveFeedback: async () => unsupported(),
    reputation: async () => unsupported(),
    saveReputation: async () => unsupported(),
    deleteReputation: async () => unsupported(),
  },
};
