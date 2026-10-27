import type { AnalyzeResponse, HistoryItem } from '@confinet/core';

/**
 * Historial y resultados guardados en el navegador. No se sincronizan entre dispositivos.
 * Se conservan los últimos MAX_ITEMS análisis para no llenar el localStorage (~5 MB).
 */
const HISTORY_KEY = 'confinet:history';
const resultKey = (id: string) => `confinet:analysis:${id}`;
export const MAX_ITEMS = 200;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getHistory(): HistoryItem[] {
  return read<HistoryItem[]>(HISTORY_KEY, []);
}

export function getResult(id: string): AnalyzeResponse | null {
  return read<AnalyzeResponse | null>(resultKey(id), null);
}

export function saveResult(result: AnalyzeResponse) {
  const item: HistoryItem = {
    id: result.id,
    analysisId: result.id,
    url: result.url,
    domain: result.domain,
    title: result.title,
    score: result.trust.score,
    level: result.trust.level,
    viewedAt: result.analyzedAt,
  };
  // Un mismo enlace solo aparece una vez: el análisis nuevo sustituye al anterior.
  const previous = getHistory();
  const replaced = previous.filter((h) => h.url === result.url);
  const history = [item, ...previous.filter((h) => h.url !== result.url)];
  const dropped = [...replaced, ...history.slice(MAX_ITEMS)];

  localStorage.setItem(resultKey(result.id), JSON.stringify(result));
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_ITEMS)));
  for (const h of dropped) localStorage.removeItem(resultKey(h.analysisId));
}

export function deleteHistoryItem(id: string) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(getHistory().filter((h) => h.id !== id)));
  localStorage.removeItem(resultKey(id));
}

export function clearHistory() {
  for (const h of getHistory()) localStorage.removeItem(resultKey(h.analysisId));
  localStorage.removeItem(HISTORY_KEY);
}

/** Análisis de hoy (para mostrar el uso, aunque en modo estático no hay cuotas). */
export function todayUsage() {
  const today = new Date().toISOString().slice(0, 10);
  const items = getHistory().filter((h) => h.viewedAt.startsWith(today));
  return {
    analyses: items.length,
    ai: items.filter((h) => getResult(h.analysisId)?.ai).length,
  };
}
