import type { ExtractedPage, LlmAnalysis } from '@confinet/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// La IA y Puter se simulan: los tests nunca llaman a servicios reales.
const runAi = vi.fn<() => Promise<LlmAnalysis>>();
vi.mock('./ai', () => ({ runAi: () => runAi() }));
vi.mock('./puter', () => ({
  isPuterSignedIn: async () => false,
  puterFetch: async () => {
    throw new (class NeedsPuterError extends Error {})('sin puter');
  },
  NeedsPuterError: class NeedsPuterError extends Error {},
}));

const { analyzeInBrowser } = await import('./analyze');
const { parseSeed, lookupReputation } = await import('./reputation');
const { saveAiSettings, getAiSettings } = await import('./settings');
const store = await import('./store');
const { parseAnalysis } = await vi.importActual<typeof import('./ai')>('./ai');

const words = (n: number) => Array.from({ length: n }, (_, i) => `palabra${i}`).join(' ');

const page = (url: string): ExtractedPage => ({
  url,
  title: 'La OMS publica nuevos datos de vacunación',
  author: 'Ana García',
  publishedAt: '2026-09-01',
  text: words(400),
  wordCount: 400,
  links: ['https://www.who.int/a', 'https://www.ine.es/b', 'https://www.nature.com/c'],
  adCount: 0,
  hasAboutPage: true,
  hasContactPage: true,
});

const goodAi: LlmAnalysis = {
  tone: 'neutral',
  fallacies: [],
  claims: [],
  summary: 'Resumen',
  assessment: 85,
  reasoning: 'Cita fuentes.',
};

beforeEach(() => {
  localStorage.clear();
  runAi.mockReset();
  // RDAP sin red en los tests.
  vi.stubGlobal('fetch', async () => new Response('{}', { status: 404 }));
});

describe('ajustes de IA', () => {
  it('no hay proveedor ni modelo por defecto', () => {
    expect(getAiSettings()).toEqual({ provider: 'none' });
  });

  it('no deja guardar un proveedor sin modelo ni Ollama sin key', () => {
    expect(() => saveAiSettings({ provider: 'puter' })).toThrow(/modelo/);
    expect(() => saveAiSettings({ provider: 'ollama-cloud', model: 'gpt-oss:120b' })).toThrow(
      /key/,
    );
  });

  it('no guarda la key de Ollama si se elige otro proveedor', () => {
    saveAiSettings({ provider: 'puter', model: 'claude-x', ollamaKey: 'secreta' } as never);
    expect(localStorage.getItem('confinet:ai')).not.toContain('secreta');
  });
});

describe('analyzeInBrowser', () => {
  it('sin IA elegida puntúa con heurísticas y lo explica', async () => {
    const url = 'https://www.reuters.com/world/x';
    const result = await analyzeInBrowser({ url, extracted: page(url) });
    expect(runAi).not.toHaveBeenCalled();
    expect(result.ai).toBeNull();
    expect(result.aiUnavailableReason).toMatch(/no has elegido proveedor/);
    expect(result.trust.pillars.ai.score).toBeNull();
    expect(result.trust.score).not.toBeNull();
    // Reputación desde la misma semilla SQL que usa la API.
    expect(result.trust.pillars.source.signals.some((s) => s.id === 'source.reputation')).toBe(
      true,
    );
  });

  it('con IA elegida añade el pilar IA', async () => {
    saveAiSettings({ provider: 'puter', model: 'claude-x' });
    runAi.mockResolvedValue(goodAi);
    const url = 'https://example.org/articulo';
    const result = await analyzeInBrowser({ url, extracted: page(url) });
    expect(result.ai).toMatchObject({ provider: 'puter', model: 'claude-x', assessment: 85 });
    expect(result.trust.pillars.ai.score).not.toBeNull();
  });

  it('si la IA falla, devuelve el resultado sin ella y con el motivo', async () => {
    saveAiSettings({ provider: 'ollama-cloud', model: 'gpt-oss:120b', ollamaKey: 'k' });
    runAi.mockRejectedValue(new Error('Ollama rechazó la API key (401).'));
    const url = 'https://example.org/b';
    const result = await analyzeInBrowser({ url, extracted: page(url) });
    expect(result.ai).toBeNull();
    expect(result.aiUnavailableReason).toContain('401');
  });

  it('sin extensión ni Puter no puede descargar un enlace pegado', async () => {
    await expect(analyzeInBrowser({ url: 'https://example.org/c' })).rejects.toThrow();
  });

  it('guarda el historial en el navegador, sin duplicar el mismo enlace', async () => {
    const url = 'https://example.org/d';
    await analyzeInBrowser({ url, extracted: page(url) });
    const second = await analyzeInBrowser({ url, extracted: page(url) });
    const history = store.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0]?.analysisId).toBe(second.id);
    expect(store.getResult(second.id)?.url).toBe('https://example.org/d');
  });
});

describe('reputación y respuesta del modelo', () => {
  it('lee la semilla SQL compartida con la API', () => {
    const seed = parseSeed(
      "INSERT INTO t VALUES ('a.com', 'reliable', 'Fuente', 'Nota'), ('b.org', 'satire', 'F', '');",
    );
    expect(seed.get('a.com')).toMatchObject({ rating: 'reliable', notes: 'Nota' });
    expect(seed.get('b.org')?.notes).toBeUndefined();
    expect(lookupReputation('www.elmundotoday.com', 'elmundotoday.com')?.rating).toBe('satire');
  });

  it('valida la respuesta del modelo aunque venga envuelta en texto', () => {
    expect(parseAnalysis('```json\n' + JSON.stringify(goodAi) + '\n```').assessment).toBe(85);
    expect(() => parseAnalysis('{"tone":"raro"}')).toThrow(/no devolvió un análisis válido/);
  });
});
