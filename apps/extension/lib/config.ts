import { browser } from 'wxt/browser';

/** Origen de la PWA. La API está en `${APP_URL}/api` (mismo origen). */
export const APP_URL: string = (import.meta.env.WXT_APP_URL || 'http://localhost:5173').replace(
  /\/$/,
  '',
);
export const API_URL = `${APP_URL}/api/v1`;

/** "api": usa la API de Cloudflare. "static": PWA en GitHub Pages, sin servidor. */
export const BACKEND: 'api' | 'static' =
  import.meta.env.WXT_BACKEND === 'static' ? 'static' : 'api';

export interface Settings {
  /** Token Bearer emitido por la PWA (cnf_…). */
  token: string | null;
  /** Analizar automáticamente (sin IA) las páginas de noticias al cargarlas. */
  autoMode: boolean;
}

const DEFAULTS: Settings = { token: null, autoMode: false };

export async function getSettings(): Promise<Settings> {
  const stored = await browser.storage.local.get(['token', 'autoMode']);
  return { ...DEFAULTS, ...(stored as Partial<Settings>) };
}

export async function saveSettings(patch: Partial<Settings>) {
  await browser.storage.local.set(patch);
}
