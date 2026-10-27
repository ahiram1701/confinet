import type { ExtractedPage } from '@confinet/core';
import { AD_HOST_RE, AD_SELECTOR_RE, finalizePage, MAX_RAW_LINKS, type RawPage } from './raw';

/*
 * Extractor para Cloudflare Workers basado en HTMLRewriter: procesa el HTML en streaming
 * sin construir un DOM, por lo que consume muy poca CPU (el plan gratuito da 10 ms).
 * Tipos mínimos declarados aquí para no arrastrar @cloudflare/workers-types a los demás paquetes.
 */
interface RwElement {
  tagName: string;
  getAttribute(name: string): string | null;
  onEndTag?(handler: (tag: unknown) => void): void;
}
interface RwText {
  text: string;
  lastInTextNode: boolean;
}
interface RwHandlers {
  element?(el: RwElement): void;
  text?(t: RwText): void;
}
interface HTMLRewriterLike {
  on(selector: string, handlers: RwHandlers): HTMLRewriterLike;
  transform(res: Response): Response;
}
declare const HTMLRewriter: { new (): HTMLRewriterLike };

/** Tamaño máximo de texto acumulado (no necesitamos más para puntuar ni para el LLM). */
const MAX_TEXT = 60_000;

export async function extractWithRewriter(res: Response, url: string): Promise<ExtractedPage> {
  const raw: RawPage = {
    url,
    title: '',
    metas: {},
    jsonLd: [],
    text: '',
    links: [],
    navLinks: [],
    adCount: 0,
  };

  let inTitle = false;
  let ldBuffer = '';
  let paragraphText = '';
  let navDepth = 0;
  let currentNav: { href: string; text: string } | null = null;

  const rewriter = new HTMLRewriter()
    .on('html', {
      element(el) {
        raw.lang = el.getAttribute('lang') ?? undefined;
      },
    })
    .on('title', {
      element(el) {
        inTitle = true;
        el.onEndTag?.(() => (inTitle = false));
      },
      text(t) {
        if (inTitle) raw.title += t.text;
      },
    })
    .on('meta[content]', {
      element(el) {
        const key = (el.getAttribute('name') ?? el.getAttribute('property') ?? '').toLowerCase();
        const content = el.getAttribute('content');
        if (key && content && !(key in raw.metas)) raw.metas[key] = content;
      },
    })
    .on('script[type="application/ld+json"]', {
      text(t) {
        ldBuffer += t.text;
        if (t.lastInTextNode) {
          raw.jsonLd.push(ldBuffer);
          ldBuffer = '';
        }
      },
    })
    .on('p, h1, h2, h3, li, blockquote', {
      text(t) {
        if (raw.text.length >= MAX_TEXT) return;
        paragraphText += t.text;
        if (t.lastInTextNode) {
          raw.text += ` ${decodeEntities(paragraphText)}`;
          paragraphText = '';
        }
      },
    })
    .on('p a[href], article a[href], main a[href]', {
      element(el) {
        if (raw.links.length < MAX_RAW_LINKS) raw.links.push(el.getAttribute('href') ?? '');
      },
    })
    .on('header, footer, nav', {
      element(el) {
        navDepth++;
        el.onEndTag?.(() => navDepth--);
      },
    })
    .on('a[href]', {
      element(el) {
        if (navDepth > 0 && raw.navLinks.length < 300) {
          currentNav = { href: el.getAttribute('href') ?? '', text: '' };
          raw.navLinks.push(currentNav);
          el.onEndTag?.(() => (currentNav = null));
        }
      },
      text(t) {
        if (currentNav) currentNav.text += t.text;
      },
    })
    .on('iframe[src]', {
      element(el) {
        if (AD_HOST_RE.test(el.getAttribute('src') ?? '')) raw.adCount++;
      },
    })
    .on('ins, div[id], div[class], aside[class], section[class]', {
      element(el) {
        if (
          AD_SELECTOR_RE.test(`${el.getAttribute('id') ?? ''} ${el.getAttribute('class') ?? ''}`)
        ) {
          raw.adCount++;
        }
      },
    });

  // Consumir el cuerpo transformado dispara los handlers.
  await rewriter.transform(res).arrayBuffer();

  raw.title = decodeEntities(raw.title);
  return finalizePage(raw);
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/** HTMLRewriter entrega el texto sin decodificar entidades HTML. */
export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === '#') {
      const n =
        code[1]?.toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}
