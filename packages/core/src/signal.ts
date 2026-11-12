import { translate, type MessageKey, type Params } from '@confinet/i18n';
import { SIGNAL_CATALOG, type SignalId } from './catalog';
import type { Signal } from './types';

export const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Crea una señal tomando pilar y peso del catálogo. La explicación se guarda como clave +
 * parámetros (se traduce al mostrarla) y, además, ya escrita en español en `explanation`.
 */
export function signal(
  id: SignalId,
  value: number,
  key: MessageKey,
  params?: Params,
  evidence?: string[],
): Signal {
  const def = SIGNAL_CATALOG[id];
  return {
    id,
    pillar: def.pillar,
    weight: def.weight,
    value: clamp01(value),
    message: params ? { key, params } : { key },
    explanation: translate('es', key, params),
    ...(evidence && evidence.length > 0 ? { evidence } : {}),
  };
}
