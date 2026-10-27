import type { DomainReputation, ReputationRating } from '@confinet/core';
// Misma semilla que la base de datos de la API: una sola fuente de verdad.
import seedSql from '../../../../api/migrations/0001_seed_reputation.sql?raw';

const ROW_RE = /\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']*)'\)/g;

export function parseSeed(sql: string): Map<string, DomainReputation> {
  const map = new Map<string, DomainReputation>();
  for (const [, domain, rating, source, notes] of sql.matchAll(ROW_RE)) {
    map.set(domain!, {
      domain: domain!,
      rating: rating as ReputationRating,
      source: source!,
      ...(notes ? { notes } : {}),
    });
  }
  return map;
}

const SEED = parseSeed(seedSql);

/** Prueba el host completo y después el dominio registrable, igual que la API. */
export function lookupReputation(hostname: string, registrable: string): DomainReputation | null {
  return SEED.get(hostname.replace(/^www\./, '')) ?? SEED.get(registrable) ?? null;
}
