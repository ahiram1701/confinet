import { Readability } from '@mozilla/readability';
import type { ExtractedPage } from '@confinet/core';
import { AD_HOST_RE, AD_SELECTOR_RE, finalizePage } from './raw';

const BLOCK_SELECTOR =
  'p, h1, h2, h3, h4, h5, h6, li, div, section, article, header, footer, blockquote, pre, td, th, dt, dd, figcaption, br';

/**
 * Extrae la página desde un DOM real (content script de la extensión).
 * Readability modifica el documento, así que trabaja sobre un clon.
 */
export function extractFromDocument(doc: Document, url: string = doc.URL): ExtractedPage {
  const metas: Record<string, string> = {};
  doc.querySelectorAll('meta[content]').forEach((m) => {
    const key = (m.getAttribute('name') ?? m.getAttribute('property') ?? '').toLowerCase();
    const content = m.getAttribute('content');
    if (key && content && !(key in metas)) metas[key] = content;
  });

  const jsonLd = [...doc.querySelectorAll('script[type="application/ld+json"]')].map(
    (s) => s.textContent ?? '',
  );

  // Enlaces del cuerpo: dentro de párrafos o del contenedor del artículo. No usamos el HTML
  // que devuelve Readability para no tener que parsear HTML no confiable en la página.
  const links = [...doc.querySelectorAll('article a[href], main a[href], p a[href]')].map(
    (a) => a.getAttribute('href') ?? '',
  );

  const navLinks = [
    ...doc.querySelectorAll(
      'header a[href], footer a[href], nav a[href], [role="navigation"] a[href]',
    ),
  ].map((a) => ({ href: a.getAttribute('href') ?? '', text: a.textContent?.trim() ?? '' }));

  const adCount =
    [...doc.querySelectorAll('iframe[src]')].filter((f) =>
      AD_HOST_RE.test(f.getAttribute('src') ?? ''),
    ).length +
    [...doc.querySelectorAll('[id], [class]')].filter((el) =>
      AD_SELECTOR_RE.test(`${el.id} ${el.getAttribute('class') ?? ''}`),
    ).length;

  // En HTML sin espacios entre etiquetas (típico de React), textContent pegaría los bloques
  // ("títuloPárrafo"). Añadimos un salto tras cada bloque, solo en el clon.
  const clone = doc.cloneNode(true) as Document;
  clone.querySelectorAll(BLOCK_SELECTOR).forEach((el) => el.append(clone.createTextNode('\n')));
  const article = new Readability(clone, { charThreshold: 200 }).parse();

  return finalizePage({
    url,
    title: article?.title ?? doc.title,
    metas,
    jsonLd,
    lang: doc.documentElement.lang || article?.lang || undefined,
    text: article?.textContent ?? doc.body?.textContent ?? '',
    byline: article?.byline ?? undefined,
    links,
    navLinks,
    adCount,
  });
}
