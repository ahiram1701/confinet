import type { DomainReputation } from '@confinet/core';
import { lookupOpenReputation } from '@confinet/core/open-reputation';
import { inArray } from 'drizzle-orm';
import type { Db } from '../db';
import { domainReputation } from '../db/schema';

/**
 * Busca la reputación del dominio. Prueba primero el host completo y luego el registrable,
 * para que "blog.ejemplo.com" pueda tener una valoración distinta de "ejemplo.com". Si la base
 * de datos (semilla + correcciones del admin) no lo tiene, consulta las listas abiertas.
 */
export async function lookupReputation(
  db: Db,
  hostname: string,
  registrable: string,
): Promise<DomainReputation | null> {
  const candidates = [...new Set([hostname.replace(/^www\./, ''), registrable])];
  const rows = await db
    .select()
    .from(domainReputation)
    .where(inArray(domainReputation.domain, candidates))
    .all();
  const row = candidates.map((d) => rows.find((r) => r.domain === d)).find(Boolean);
  return row
    ? {
        domain: row.domain,
        rating: row.rating,
        source: row.source,
        ...(row.notes ? { notes: row.notes } : {}),
      }
    : lookupOpenReputation(hostname, registrable);
}
