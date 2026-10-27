import { registrableDomain, type ExtractedPage } from '@confinet/core';

/**
 * Datos "en bruto" que recogen ambos extractores (DOM y HTMLRewriter).
 * `finalizePage` los convierte en un `ExtractedPage` con la misma lógica en los dos entornos.
 */
export interface RawPage {
  url: string;
  title: string;
  /** Mapa de <meta name|property="..." content="...">, claves en minúsculas. */
  metas: Record<string, string>;
  /** Contenido de los <script type="application/ld+json">. */
  jsonLd: string[];
  lang?: string;
  text: string;
  /** Autor detectado por el extractor (p. ej. byline de Readability). */
  byline?: string;
  /** Enlaces del cuerpo del artículo. */
  links: string[];
  /** Enlaces de navegación (cabecera/pie), para detectar "Quiénes somos"/"Contacto". */
  navLinks: { href: string; text: string }[];
  adCount: number;
}

const ABOUT_RE =
  /(qui[ée]nes somos|sobre nosotros|acerca de|about( us)?|nosotros|equipo|staff|redacci[óo]n|masthead|ethics|[ée]tica|transparencia)/i;
const CONTACT_RE = /(contact|contacto|cont[áa]ctanos|escr[íi]benos)/i;

/** Límite de enlaces en la página final (coincide con la validación de la API). */
export const MAX_LINKS = 500;
/** Límite de enlaces en bruto que recoge el extractor antes de priorizar. */
export const MAX_RAW_LINKS = 3000;

export const AD_SELECTOR_RE =
  /(^|[\s_-])(ad|ads|advert|advertisement|adsbygoogle|adslot|ad-slot|banner-ad|sponsor|taboola|outbrain|dfp|gpt-ad)([\s_-]|$)/i;
export const AD_HOST_RE =
  /(doubleclick\.net|googlesyndication\.com|adservice\.google|taboola\.com|outbrain\.com|amazon-adsystem\.com|criteo\.|adnxs\.com|teads\.tv)/i;

export function finalizePage(raw: RawPage): ExtractedPage {
  const ld = parseJsonLd(raw.jsonLd);
  const author = clean(
    ld.author ??
      raw.metas['author'] ??
      raw.metas['article:author'] ??
      raw.metas['parsely-author'] ??
      raw.metas['dc.creator'] ??
      raw.byline,
  );
  const publishedAt = clean(
    ld.datePublished ??
      raw.metas['article:published_time'] ??
      raw.metas['og:published_time'] ??
      raw.metas['date'] ??
      raw.metas['dc.date'] ??
      raw.metas['parsely-pub-date'],
  );
  const siteName = clean(raw.metas['og:site_name'] ?? ld.publisher);
  const title = clean(raw.metas['og:title'] ?? ld.headline ?? raw.title) ?? '';
  const text = raw.text.replace(/\s+/g, ' ').trim();
  const wordCount = text ? text.split(' ').length : 0;

  const base = new URL(raw.url);
  // Primero los enlaces externos (posibles fuentes): en páginas con muchos enlaces internos
  // (p. ej. Wikipedia) las referencias quedarían fuera del límite.
  // Se compara por hostname con caché: la CPU cuenta en el plan gratuito de Workers.
  const own = registrableDomain(raw.url);
  const isExternal = new Map<string, boolean>();
  const external: string[] = [];
  const internal: string[] = [];
  for (const link of uniqueAbsolute(raw.links, base)) {
    const host = new URL(link).hostname;
    if (!isExternal.has(host)) isExternal.set(host, registrableDomain(host) !== own);
    (isExternal.get(host) ? external : internal).push(link);
  }
  const links = [...external, ...internal].slice(0, MAX_LINKS);

  return {
    url: raw.url,
    title,
    ...(author && !looksLikeUrl(author) ? { author } : {}),
    ...(publishedAt ? { publishedAt } : {}),
    ...(siteName ? { siteName } : {}),
    ...(raw.lang ? { lang: raw.lang } : {}),
    text,
    wordCount,
    links,
    adCount: raw.adCount,
    hasAboutPage: raw.navLinks.some((l) => ABOUT_RE.test(l.text) || ABOUT_RE.test(l.href)),
    hasContactPage: raw.navLinks.some((l) => CONTACT_RE.test(l.text) || CONTACT_RE.test(l.href)),
  };
}

interface LdInfo {
  author?: string;
  datePublished?: string;
  headline?: string;
  publisher?: string;
}

/** Busca un artículo (NewsArticle, Article, BlogPosting...) en los bloques JSON-LD. */
export function parseJsonLd(blocks: string[]): LdInfo {
  for (const block of blocks) {
    let data: unknown;
    try {
      data = JSON.parse(block);
    } catch {
      continue;
    }
    for (const node of flattenLd(data)) {
      const type = ([] as unknown[]).concat(node['@type'] ?? []).join(' ');
      if (!/(Article|BlogPosting|Report|NewsArticle)/.test(type)) continue;
      return {
        author: nameOf(node.author),
        datePublished: typeof node.datePublished === 'string' ? node.datePublished : undefined,
        headline: typeof node.headline === 'string' ? node.headline : undefined,
        publisher: nameOf(node.publisher),
      };
    }
  }
  return {};
}

type LdNode = Record<string, unknown>;

function flattenLd(data: unknown): LdNode[] {
  if (Array.isArray(data)) return data.flatMap(flattenLd);
  if (data && typeof data === 'object') {
    const node = data as LdNode;
    return [node, ...(node['@graph'] ? flattenLd(node['@graph']) : [])];
  }
  return [];
}

function nameOf(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const names = value.map(nameOf).filter(Boolean);
    return names.length ? names.join(', ') : undefined;
  }
  if (value && typeof value === 'object' && typeof (value as LdNode).name === 'string') {
    return (value as LdNode).name as string;
  }
  return undefined;
}

function clean(value: string | undefined): string | undefined {
  const v = value
    ?.replace(/\s+/g, ' ')
    .replace(/^(por|by)\s+/i, '')
    .trim();
  return v ? v.slice(0, 200) : undefined;
}

function looksLikeUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function uniqueAbsolute(hrefs: string[], base: URL): string[] {
  const out = new Set<string>();
  for (const href of hrefs) {
    try {
      const u = new URL(href, base);
      if (u.protocol === 'http:' || u.protocol === 'https:') out.add(u.toString());
    } catch {
      // href inválido: se ignora
    }
    if (out.size >= MAX_RAW_LINKS) break;
  }
  return [...out];
}
