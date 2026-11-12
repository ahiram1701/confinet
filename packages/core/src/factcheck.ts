import type { LlmAnalysis } from './llm-schema';
import { normalizeVerdict } from './signals/ai';
import type { FactCheckMatch } from './types';

const ENDPOINT = 'https://factchecktools.googleapis.com/v1alpha1/claims:search';

interface ClaimSearchResponse {
  claims?: {
    text?: string;
    claimReview?: { publisher?: { name?: string }; url?: string; textualRating?: string }[];
  }[];
}

export interface FactCheckSearch {
  matches: FactCheckMatch[];
  /** `rejected`: Google rechazó la key (400/403); `error`: red o servicio caído. */
  status: 'ok' | 'skipped' | 'rejected' | 'error';
}

export interface FactCheckOptions {
  /** Qué buscar si la IA no extrajo afirmaciones verificables (p. ej. el titular). */
  fallbackQuery?: string;
  timeoutMs?: number;
}

/**
 * Busca las afirmaciones principales (extraídas por la IA) en Google Fact Check Tools.
 * API gratuita con API key; admite CORS, así que funciona igual en el Worker y en el navegador.
 * Nunca lanza: sin key o si falla, devuelve los resultados que haya y el motivo en `status`.
 */
export async function searchFactChecks(
  apiKey: string | undefined,
  claims: LlmAnalysis['claims'],
  lang?: string,
  { fallbackQuery, timeoutMs = 4_000 }: FactCheckOptions = {},
): Promise<FactCheckSearch> {
  if (!apiKey) return { matches: [], status: 'skipped' };
  let queries = claims
    .filter((c) => c.verifiable)
    .slice(0, 3)
    .map((c) => c.text.slice(0, 200));
  if (queries.length === 0 && fallbackQuery?.trim()) queries = [fallbackQuery.trim().slice(0, 200)];
  if (queries.length === 0) return { matches: [], status: 'skipped' };

  const results = await Promise.all(
    queries.map((query) => searchOne(apiKey, query, lang, timeoutMs)),
  );
  const status = results.find((r) => r.status !== 'ok')?.status ?? 'ok';
  const seen = new Set<string>();
  const matches = results
    .flatMap((r) => r.matches)
    .filter((m) => !seen.has(m.url) && seen.add(m.url));
  return { matches, status };
}

async function searchOne(
  apiKey: string,
  query: string,
  lang: string | undefined,
  timeoutMs: number,
): Promise<FactCheckSearch> {
  const params = new URLSearchParams({ query, key: apiKey, pageSize: '3' });
  if (lang) params.set('languageCode', lang.slice(0, 2));
  try {
    const res = await fetch(`${ENDPOINT}?${params}`, { signal: AbortSignal.timeout(timeoutMs) });
    if (res.status === 400 || res.status === 403) return { matches: [], status: 'rejected' };
    if (!res.ok) return { matches: [], status: 'error' };
    const data = (await res.json()) as ClaimSearchResponse;
    const matches = (data.claims ?? []).flatMap((claim) => {
      const review = claim.claimReview?.[0];
      if (!review?.textualRating || !review.url) return [];
      return [
        {
          claim: claim.text ?? query,
          rating: review.textualRating,
          verdict: normalizeVerdict(review.textualRating),
          publisher: review.publisher?.name ?? new URL(review.url).hostname,
          url: review.url,
        } satisfies FactCheckMatch,
      ];
    });
    return { matches, status: 'ok' };
  } catch {
    return { matches: [], status: 'error' };
  }
}

/** Comprueba una key con una búsqueda mínima (botón «Probar key»). */
export async function testFactCheckKey(apiKey: string): Promise<FactCheckSearch['status']> {
  return (await searchOne(apiKey, 'vaccine', undefined, 8_000)).status;
}
