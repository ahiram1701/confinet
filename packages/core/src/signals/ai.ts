import type { LlmAnalysis } from '../llm-schema';
import { signal } from '../signal';
import type { FactCheckMatch, FactCheckVerdict, Signal } from '../types';

const TONE: Record<LlmAnalysis['tone'], number> = {
  neutral: 1,
  emotional: 0.6,
  sensationalist: 0.25,
  propagandistic: 0,
};

export function aiSignals(
  analysis: LlmAnalysis | null,
  factChecks: FactCheckMatch[] = [],
): Signal[] {
  const signals: Signal[] = [];

  if (analysis) {
    signals.push(
      signal('ai.assessment', analysis.assessment / 100, 'signal.ai.assessment.text', {
        text: analysis.reasoning || analysis.summary,
      }),
    );

    signals.push(signal('ai.tone', TONE[analysis.tone], `signal.ai.tone.${analysis.tone}`));

    const n = analysis.fallacies.length;
    signals.push(
      signal(
        'ai.fallacies',
        1 - n * 0.25,
        n === 0 ? 'signal.ai.fallacies.none' : 'signal.ai.fallacies.some',
        { n },
        analysis.fallacies.map((f) => `${f.type}: "${f.quote}"`),
      ),
    );

    const verifiable = analysis.claims.filter((c) => c.verifiable);
    if (verifiable.length > 0) {
      const sourced = verifiable.filter((c) => c.sourced).length;
      signals.push(
        signal(
          'ai.claimsSourced',
          sourced / verifiable.length,
          'signal.ai.claimsSourced.ratio',
          { sourced, n: verifiable.length },
          verifiable.filter((c) => !c.sourced).map((c) => c.text),
        ),
      );
    }
  }

  if (factChecks.length > 0) {
    const debunked = factChecks.filter((f) => f.verdict === 'false' || f.verdict === 'misleading');
    signals.push(
      signal(
        'ai.factcheck',
        debunked.length === 0 ? 1 : 0,
        debunked.length === 0 ? 'signal.ai.factcheck.clean' : 'signal.ai.factcheck.debunked',
        { n: debunked.length === 0 ? factChecks.length : debunked.length },
        factChecks.map((f) => `${f.publisher}: "${f.rating}" — ${f.claim}`),
      ),
    );
  }

  return signals;
}

/**
 * Convierte la calificación textual de un verificador ("Falso", "Engañoso", "Mostly true"...)
 * en un veredicto normalizado.
 */
export function normalizeVerdict(rating: string): FactCheckVerdict {
  const r = rating.toLowerCase();
  if (
    /(engañ|enga[nñ]oso|misleading|sin contexto|missing context|exager|parcialmente|half|mixed|mezcla)/.test(
      r,
    )
  )
    return 'misleading';
  if (/(falso|false|bulo|fake|incorrect|pants on fire|no es cierto|wrong)/.test(r)) return 'false';
  if (/(verdader|cierto|true|correct|accurate|real)/.test(r)) return 'true';
  return 'unknown';
}
