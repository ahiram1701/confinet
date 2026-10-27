import { normalizeVerdict, type FactCheckMatch, type LlmAnalysis } from '@confinet/core';

interface ClaimSearchResponse {
  claims?: {
    text?: string;
    claimReview?: { publisher?: { name?: string }; url?: string; textualRating?: string }[];
  }[];
}

/**
 * Busca las afirmaciones principales (extraídas por el LLM) en Google Fact Check Tools.
 * API gratuita: solo necesita una API key. Si no hay clave o falla, devuelve [].
 */
export async function searchFactChecks(
  apiKey: string | undefined,
  claims: LlmAnalysis['claims'],
  lang?: string,
): Promise<FactCheckMatch[]> {
  if (!apiKey) return [];
  const queries = claims
    .filter((c) => c.verifiable)
    .slice(0, 3)
    .map((c) => c.text.slice(0, 200));

  const results = await Promise.all(
    queries.map(async (query) => {
      const params = new URLSearchParams({ query, key: apiKey, pageSize: '3' });
      if (lang) params.set('languageCode', lang.slice(0, 2));
      try {
        const res = await fetch(
          `https://factchecktools.googleapis.com/v1alpha1/claims:search?${params}`,
          { signal: AbortSignal.timeout(4_000) },
        );
        if (!res.ok) return [];
        const data = (await res.json()) as ClaimSearchResponse;
        return (data.claims ?? []).flatMap((claim) => {
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
      } catch {
        return [];
      }
    }),
  );

  // Sin duplicados por URL de la verificación.
  const seen = new Set<string>();
  return results.flat().filter((m) => !seen.has(m.url) && seen.add(m.url));
}
