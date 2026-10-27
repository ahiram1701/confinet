import { getDomain, getHostname } from 'tldts';

const TRACKING_PARAMS = /^(utm_\w+|fbclid|gclid|mc_cid|mc_eid|ref|ref_src|igshid|_ga)$/i;

/**
 * Normaliza una URL para usarla como clave de caché: sin fragmento, sin parámetros
 * de seguimiento, host en minúsculas y sin "www.", parámetros ordenados.
 */
export function normalizeUrl(input: string): string {
  const url = new URL(input);
  url.hash = '';
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  const params = [...url.searchParams.entries()]
    .filter(([key]) => !TRACKING_PARAMS.test(key))
    .sort(([a], [b]) => a.localeCompare(b));
  url.search = new URLSearchParams(params).toString();
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1);
  }
  return url.toString();
}

/** Dominio registrable (eTLD+1): "noticias.elpais.com" → "elpais.com". */
export function registrableDomain(input: string): string {
  return getDomain(input) ?? getHostname(input) ?? input;
}

export function isHttpUrl(input: string): boolean {
  try {
    const { protocol } = new URL(input);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}
