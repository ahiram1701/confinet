import { SIGNAL_CATALOG, type SignalId } from './catalog';
import type { Signal } from './types';

export const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Crea una señal tomando pilar y peso del catálogo. */
export function signal(
  id: SignalId,
  value: number,
  explanation: string,
  evidence?: string[],
): Signal {
  const def = SIGNAL_CATALOG[id];
  return {
    id,
    pillar: def.pillar,
    weight: def.weight,
    value: clamp01(value),
    explanation,
    ...(evidence && evidence.length > 0 ? { evidence } : {}),
  };
}
