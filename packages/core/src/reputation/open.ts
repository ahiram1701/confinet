import data from '../../data/reputation-wikipedia.json';
import type { DomainReputation } from '../types';
import type { OpenRating } from './rsp';

/**
 * Reputación según listas abiertas (hoy, «Perennial sources» de Wikipedia, CC BY-SA 4.0; ver
 * packages/core/data/README.md). Va en un subpath propio para que solo lo descargue quien lo use.
 * Se consulta después de la semilla de Confinet, que tiene prioridad.
 */
export const OPEN_REPUTATION_SOURCE = 'Wikipedia (Perennial sources)';

const DOMAINS = data.domains as unknown as Record<string, [OpenRating, string]>;

export function lookupOpenReputation(hostname: string, domain: string): DomainReputation | null {
  for (const candidate of [hostname.replace(/^www\./, ''), domain]) {
    const hit = DOMAINS[candidate];
    if (hit) {
      return { domain: candidate, rating: hit[0], source: OPEN_REPUTATION_SOURCE, notes: hit[1] };
    }
  }
  return null;
}

export const OPEN_REPUTATION_DATE = data.generatedAt;
