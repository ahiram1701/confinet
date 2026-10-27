import {
  aiSignals,
  computeTrustScore,
  contentSignals,
  isHttpUrl,
  normalizeUrl,
  registrableDomain,
  sourceSignals,
  type AnalyzeRequest,
  type AnalyzeResponse,
  type ExtractedPage,
  type LlmAnalysis,
} from '@confinet/core';
import { extractFromDocument } from '@confinet/extract/dom';
import { runAi } from './ai';
import { isPuterSignedIn, puterFetch } from './puter';
import { lookupReputation } from './reputation';
import { getAiSettings, isAiConfigured } from './settings';
import { saveResult } from './store';

/**
 * Análisis completo en el navegador (modo GitHub Pages, sin servidor):
 * misma extracción, señales y puntuación que la API, con la IA que elija el usuario.
 */
export async function analyzeInBrowser(req: AnalyzeRequest): Promise<AnalyzeResponse> {
  if (!isHttpUrl(req.url)) throw new Error('Solo se pueden analizar enlaces http(s).');
  const url = new URL(req.url);

  // 1. Contenido: el que manda la extensión o, si no, descargado vía Puter (CORS).
  const page: ExtractedPage = req.extracted
    ? { ...req.extracted, url: url.toString() }
    : await downloadAndExtract(url.toString());

  // 2. Fuente
  const domain = registrableDomain(url.toString());
  const reputation = lookupReputation(url.hostname, domain);
  const ageDays = await domainAgeDays(domain);

  // 3. IA (solo si el usuario eligió proveedor y modelo)
  const settings = getAiSettings();
  let analysis: LlmAnalysis | null = null;
  let aiUnavailableReason: string | undefined;
  if (req.skipAi) {
    // sin IA a propósito
  } else if (!isAiConfigured(settings)) {
    aiUnavailableReason =
      'Sin análisis con IA: no has elegido proveedor. Puedes activarlo en «Cuenta» (Puter u Ollama Cloud).';
  } else if (page.wordCount < 80) {
    aiUnavailableReason = 'El texto es demasiado corto para analizarlo con IA.';
  } else {
    try {
      analysis = await runAi(settings, {
        url: page.url,
        title: page.title,
        text: page.text,
        lang: page.lang,
      });
    } catch (error) {
      aiUnavailableReason = `La IA no respondió: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  // 4. Puntuación
  const trust = computeTrustScore([
    ...sourceSignals({
      url: url.toString(),
      reputation,
      domainAgeDays: ageDays,
      hasAboutPage: page.hasAboutPage,
      hasContactPage: page.hasContactPage,
    }),
    ...contentSignals(page),
    ...aiSignals(analysis),
  ]);

  const result: AnalyzeResponse = {
    id: crypto.randomUUID(),
    url: normalizeUrl(url.toString()),
    domain,
    title: page.title.slice(0, 500),
    analyzedAt: new Date().toISOString(),
    cached: false,
    trust,
    ai: analysis
      ? { ...analysis, provider: settings.provider, model: settings.model ?? '?' }
      : null,
    ...(aiUnavailableReason ? { aiUnavailableReason } : {}),
    factChecks: [],
  };
  saveResult(result);
  return result;
}

async function downloadAndExtract(url: string): Promise<ExtractedPage> {
  const res = await puterFetch(url, { headers: { accept: 'text/html' } });
  if (!res.ok) throw new Error(`No se pudo descargar la página (HTTP ${res.status}).`);
  const html = await res.text();
  // DOMParser crea un documento inerte: no ejecuta scripts ni carga recursos.
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return extractFromDocument(doc, url);
}

const AGE_CACHE = 'confinet:rdap';
const AGE_TTL_MS = 30 * 24 * 3600 * 1000;

/** Antigüedad del dominio por RDAP, con caché local de 30 días. Si falla, la señal no se mide. */
export async function domainAgeDays(domain: string): Promise<number | null> {
  let cache: Record<string, { registeredAt: string | null; checkedAt: number }> = {};
  try {
    cache = JSON.parse(localStorage.getItem(AGE_CACHE) ?? '{}');
  } catch {
    // caché corrupta: se ignora
  }
  const hit = cache[domain];
  if (hit && Date.now() - hit.checkedAt < AGE_TTL_MS && hit.registeredAt) {
    return ageInDays(hit.registeredAt);
  }

  const registeredAt = await lookupRegistration(domain);
  if (registeredAt) {
    cache[domain] = { registeredAt, checkedAt: Date.now() };
    try {
      localStorage.setItem(AGE_CACHE, JSON.stringify(cache));
    } catch {
      // sin espacio: no pasa nada
    }
  }
  return registeredAt ? ageInDays(registeredAt) : null;
}

async function lookupRegistration(domain: string): Promise<string | null> {
  const url = `https://rdap.org/domain/${encodeURIComponent(domain)}`;
  const parse = async (res: Response) => {
    if (!res.ok) return null;
    const data = (await res.json()) as { events?: { eventAction?: string; eventDate?: string }[] };
    return data.events?.find((e) => e.eventAction === 'registration')?.eventDate ?? null;
  };
  try {
    return await parse(await fetch(url, { headers: { accept: 'application/rdap+json' } }));
  } catch {
    // Algunos registros no permiten CORS: se intenta vía Puter si hay sesión.
    if (!(await isPuterSignedIn())) return null;
    try {
      return await parse(await puterFetch(url));
    } catch {
      return null;
    }
  }
}

const ageInDays = (iso: string) =>
  Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
