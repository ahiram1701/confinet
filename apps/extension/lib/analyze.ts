import {
  computeTrustScore,
  contentSignals,
  normalizeUrl,
  sourceSignals,
  type AnalyzeResponse,
  type ExtractedPage,
  type TrustLevel,
} from '@confinet/core';
import { browser } from 'wxt/browser';
import { API_URL, BACKEND, getSettings } from './config';
import { getTabState, setTabState } from './state';

const BADGE_COLORS: Record<TrustLevel | 'pending', string> = {
  high: '#16794a',
  medium: '#a35d00',
  low: '#c0292b',
  unknown: '#6b7280',
  pending: '#6b7280',
};

export function isAnalyzableUrl(url: string | undefined): url is string {
  return (
    !!url &&
    /^https?:\/\//.test(url) &&
    !/^https?:\/\/(chrome|chromewebstore|microsoftedge)\.google\.com/.test(url)
  );
}

/** Inyecta el extractor (Readability) en la pestaña y devuelve la página extraída. */
async function extract(tabId: number): Promise<ExtractedPage> {
  const [injection] = await browser.scripting.executeScript({
    target: { tabId },
    files: ['/extractor.js'],
  });
  const page = injection?.result as ExtractedPage | undefined;
  if (!page) throw new Error('No se pudo leer el contenido de la página.');
  return page;
}

async function setBadge(
  tabId: number,
  score: number | null,
  level: TrustLevel | 'pending',
  provisional = false,
) {
  await browser.action.setBadgeBackgroundColor({ tabId, color: BADGE_COLORS[level] });
  await browser.action.setBadgeText({
    tabId,
    text: score == null ? '?' : `${provisional ? '~' : ''}${score}`,
  });
}

/**
 * 1) Extrae la página y calcula al instante una puntuación local provisional (solo heurísticas).
 * 2) Pide el análisis completo a la API (reputación, RDAP, IA, fact-checks) y lo sustituye.
 */
export async function analyzeTab(
  tabId: number,
  url: string,
  opts: { force?: boolean; skipAi?: boolean } = {},
) {
  const previous = await getTabState(tabId);
  if (
    !opts.force &&
    (previous?.status === 'done' || previous?.status === 'local') &&
    sameUrl(previous.url, url)
  )
    return;

  await setTabState(tabId, { status: 'extracting', url });
  let page: ExtractedPage;
  try {
    page = await extract(tabId);
  } catch (error) {
    await setTabState(tabId, {
      status: 'error',
      url,
      error: messageOf(error, 'No se puede analizar esta página.'),
    });
    await browser.action.setBadgeText({ tabId, text: '' });
    return;
  }

  const quick = computeTrustScore([
    ...sourceSignals({ url, hasAboutPage: page.hasAboutPage, hasContactPage: page.hasContactPage }),
    ...contentSignals(page),
  ]);
  if (BACKEND === 'static') {
    // Sin servidor: la puntuación local es el resultado; el análisis completo (reputación,
    // antigüedad del dominio, IA) se hace en la PWA cuando el usuario lo pide.
    await setTabState(tabId, { status: 'local', url, title: page.title, quick, page });
    await setBadge(tabId, quick.score, quick.level, true);
    return;
  }

  await setTabState(tabId, { status: 'quick', url, title: page.title, quick });
  await setBadge(tabId, quick.score, 'pending', true);

  try {
    const result = await requestAnalysis(url, page, opts.skipAi);
    await setTabState(tabId, { status: 'done', url, result });
    await setBadge(tabId, result.trust.score, result.trust.level);
  } catch (error) {
    await setTabState(tabId, {
      status: 'error',
      url,
      error: messageOf(error, 'Error de conexión con Confinet.'),
      quick,
      title: page.title,
    });
    await setBadge(tabId, quick.score, quick.level, true);
  }
}

async function requestAnalysis(
  url: string,
  page: ExtractedPage,
  skipAi?: boolean,
): Promise<AnalyzeResponse> {
  const { token } = await getSettings();
  const res = await fetch(`${API_URL}/analyze`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    // Recortamos el texto: la API no necesita más y ahorra ancho de banda.
    body: JSON.stringify({
      url,
      extracted: { ...page, text: page.text.slice(0, 100_000) },
      skipAi,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
  return data as AnalyzeResponse;
}

function sameUrl(a: string, b: string) {
  try {
    return normalizeUrl(a) === normalizeUrl(b);
  } catch {
    return a === b;
  }
}

function messageOf(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** Heurística barata para el modo automático: rutas con pinta de artículo. */
export function looksLikeArticle(url: string): boolean {
  const { pathname } = new URL(url);
  const segments = pathname.split('/').filter(Boolean);
  return (
    /\/(19|20)\d{2}\/|\d{6,}|[a-z0-9]+(-[a-z0-9]+){3,}/i.test(pathname) || segments.length >= 3
  );
}
