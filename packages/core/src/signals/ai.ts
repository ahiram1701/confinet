import type { LlmAnalysis } from '../llm-schema';
import { signal } from '../signal';
import type { FactCheckMatch, FactCheckVerdict, Signal } from '../types';

const TONE: Record<LlmAnalysis['tone'], [number, string]> = {
  neutral: [1, 'Tono neutral e informativo.'],
  emotional: [0.6, 'Tono emocional.'],
  sensationalist: [0.25, 'Tono sensacionalista.'],
  propagandistic: [0, 'Tono propagandístico.'],
};

export function aiSignals(
  analysis: LlmAnalysis | null,
  factChecks: FactCheckMatch[] = [],
): Signal[] {
  const signals: Signal[] = [];

  if (analysis) {
    signals.push(
      signal('ai.assessment', analysis.assessment / 100, analysis.reasoning || analysis.summary),
    );

    const [toneValue, toneText] = TONE[analysis.tone];
    signals.push(signal('ai.tone', toneValue, toneText));

    const n = analysis.fallacies.length;
    signals.push(
      signal(
        'ai.fallacies',
        1 - n * 0.25,
        n === 0 ? 'No se detectan falacias.' : `Se detectan ${n} posible(s) falacia(s).`,
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
          `${sourced} de ${verifiable.length} afirmaciones verificables citan una fuente.`,
          verifiable.filter((c) => !c.sourced).map((c) => `Sin fuente: ${c.text}`),
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
        debunked.length === 0
          ? `${factChecks.length} verificación(es) externa(s) sin desmentidos.`
          : `${debunked.length} afirmación(es) han sido desmentidas por verificadores.`,
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
