import type { AnalyzeResponse, ExtractedPage, TrustScore } from '@confinet/core';
import { browser } from 'wxt/browser';

/** Estado del análisis de una pestaña, compartido entre background y popup. */
export type TabState =
  | { status: 'extracting'; url: string }
  | { status: 'quick'; url: string; title: string; quick: TrustScore }
  | { status: 'done'; url: string; result: AnalyzeResponse }
  /** Modo sin servidor: solo puntuación local; el análisis completo se hace en la PWA. */
  | { status: 'local'; url: string; title: string; quick: TrustScore; page: ExtractedPage }
  | { status: 'error'; url: string; error: string; quick?: TrustScore; title?: string };

const key = (tabId: number) => `tab:${tabId}`;

// storage.session: vive en memoria mientras el navegador esté abierto y no se sincroniza.
export async function getTabState(tabId: number): Promise<TabState | null> {
  const data = await browser.storage.session.get(key(tabId));
  return (data[key(tabId)] as TabState | undefined) ?? null;
}

export async function setTabState(tabId: number, state: TabState) {
  await browser.storage.session.set({ [key(tabId)]: state });
}

export async function clearTabState(tabId: number) {
  await browser.storage.session.remove(key(tabId));
}

export function onTabStateChange(tabId: number, cb: (state: TabState | null) => void) {
  const listener = (changes: Record<string, { newValue?: unknown }>, area: string) => {
    if (area === 'session' && key(tabId) in changes) {
      cb((changes[key(tabId)]?.newValue as TabState | undefined) ?? null);
    }
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}

export type Message =
  { type: 'analyze'; tabId: number; force?: boolean } | { type: 'confinet:token'; token: string };
