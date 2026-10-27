import { PILLAR_WEIGHTS, SIGNAL_CATALOG } from './catalog';
import type { Pillar, PillarResult, Signal, TrustLevel, TrustScore } from './types';

const PILLARS: Pillar[] = ['source', 'content', 'ai'];

/** Peso total posible de cada pilar (suma de los pesos del catálogo). */
const PILLAR_MAX_WEIGHT = Object.values(SIGNAL_CATALOG).reduce(
  (acc, def) => ({ ...acc, [def.pillar]: (acc[def.pillar] ?? 0) + def.weight }),
  {} as Record<Pillar, number>,
);

/** Por debajo de esta certeza no damos una puntuación: sería engañoso. */
export const MIN_CERTAINTY = 0.25;

export function computeTrustScore(signals: Signal[]): TrustScore {
  const pillars = Object.fromEntries(
    PILLARS.map((pillar) => [pillar, pillarResult(pillar, signals)]),
  ) as Record<Pillar, PillarResult>;

  // Media ponderada de los pilares disponibles: si falta uno, el resto se renormaliza.
  let weighted = 0;
  let weightSum = 0;
  let certainty = 0;
  for (const pillar of PILLARS) {
    const { score, signals: ps } = pillars[pillar];
    const measured = ps.reduce((a, s) => a + s.weight, 0);
    certainty += PILLAR_WEIGHTS[pillar] * Math.min(1, measured / PILLAR_MAX_WEIGHT[pillar]);
    if (score != null) {
      weighted += score * PILLAR_WEIGHTS[pillar];
      weightSum += PILLAR_WEIGHTS[pillar];
    }
  }

  let score = weightSum > 0 ? weighted / weightSum : null;

  const caps: TrustScore['caps'] = [];
  const debunked = signals.find((s) => s.id === 'ai.factcheck' && s.value === 0);
  if (debunked)
    caps.push({ reason: 'Contiene afirmaciones desmentidas por verificadores.', max: 35 });
  const unreliable = signals.find((s) => s.id === 'source.reputation' && s.value === 0);
  if (unreliable) caps.push({ reason: 'El medio está señalado como poco fiable.', max: 45 });

  if (score != null) {
    for (const cap of caps) score = Math.min(score, cap.max);
    score = Math.round(score);
  }

  certainty = Math.round(certainty * 100) / 100;
  if (certainty < MIN_CERTAINTY) score = null;

  return { score, level: levelFor(score), certainty, pillars, caps };
}

function pillarResult(pillar: Pillar, all: Signal[]): PillarResult {
  const signals = all.filter((s) => s.pillar === pillar);
  const total = signals.reduce((a, s) => a + s.weight, 0);
  const score =
    total > 0 ? (signals.reduce((a, s) => a + s.value * s.weight, 0) / total) * 100 : null;
  return { pillar, score: score == null ? null : Math.round(score), signals };
}

export function levelFor(score: number | null): TrustLevel {
  if (score == null) return 'unknown';
  if (score >= 70) return 'high';
  if (score >= 45) return 'medium';
  return 'low';
}

export const LEVEL_LABELS: Record<TrustLevel, string> = {
  high: 'Confianza alta',
  medium: 'Confianza media',
  low: 'Confianza baja',
  unknown: 'Sin datos suficientes',
};
