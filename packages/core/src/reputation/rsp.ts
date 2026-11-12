/**
 * Lector de «Wikipedia:Reliable sources/Perennial sources» (RSP). Solo usa sintaxis que Node
 * puede ejecutar directamente (sin imports de valores), porque también lo usa
 * scripts/update-reputation.mjs.
 */

export type OpenRating = 'reliable' | 'mixed' | 'unreliable';

export interface RspEntry {
  name: string;
  rating: OpenRating;
  domains: string[];
}

/** Estados de RSP: gr = generally reliable, nc/m = sin consenso, gu = unreliable, d = deprecated. */
const STATUS: Record<string, OpenRating> = {
  gr: 'reliable',
  nc: 'mixed',
  m: 'mixed',
  gu: 'unreliable',
  d: 'unreliable',
};

/**
 * Une dos valoraciones de la misma fuente o dominio. RSP valora a veces por tema o por época
 * (p. ej. Fox News: poco fiable en política y ciencia, sin consenso en lo demás): si no
 * coinciden, la fuente es «mixta».
 */
export function combine(a: OpenRating, b: OpenRating): OpenRating {
  return a === b ? a : 'mixed';
}

/** Extrae las filas de una página de RSP (wikitext de action=raw). */
export function parseRsp(wikitext: string): RspEntry[] {
  const entries: RspEntry[] = [];
  for (const row of wikitext.split(/\n\|-(?=[^\n]*\bid=")/).slice(1)) {
    const name = row.match(/\bid="([^"]+)"/)?.[1];
    const ratings = [...row.matchAll(/\{\{WP:RSPSTATUS\|(\w+)/g)]
      .map((m) => STATUS[m[1]!])
      .filter((r): r is OpenRating => !!r);
    const domains = [...row.matchAll(/\{\{WP:RSPUSES\|([^}]*)\}\}/g)]
      .flatMap((m) => m[1]!.split('|'))
      .map((d) =>
        d
          .trim()
          .toLowerCase()
          .replace(/^www\./, ''),
      )
      // Solo dominios: sin parámetros (x=y) ni rutas (la búsqueda es por dominio).
      .filter((d) => /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d));
    if (!name || ratings.length === 0 || domains.length === 0) continue;
    entries.push({ name, rating: ratings.reduce(combine), domains: [...new Set(domains)] });
  }
  return entries;
}

/** Une las filas en un mapa dominio → [valoración, nombre], ordenado para diffs legibles. */
export function toDomainMap(entries: RspEntry[]): Record<string, [OpenRating, string]> {
  const map = new Map<string, [OpenRating, string]>();
  for (const { name, rating, domains } of entries) {
    for (const domain of domains) {
      const prev = map.get(domain);
      map.set(domain, prev ? [combine(prev[0], rating), prev[1]] : [rating, name]);
    }
  }
  return Object.fromEntries([...map].sort(([a], [b]) => a.localeCompare(b)));
}
