/// <reference types="chrome" />
import { chromium, expect, test, type BrowserContext, type Page } from '@playwright/test';
import type { TabState } from '../lib/state';
import { fileURLToPath } from 'node:url';

const EXTENSION_PATH = fileURLToPath(new URL('../.output-e2e/chrome-mv3', import.meta.url));
const ARTICLE = 'http://localhost:4180/noticia';

let context: BrowserContext;
let extensionId: string;

test.beforeAll(async () => {
  // Chromium aislado con la extensión cargada, como si la hubiera instalado un usuario.
  context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    args: [`--disable-extensions-except=${EXTENSION_PATH}`, `--load-extension=${EXTENSION_PATH}`],
  });
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  extensionId = new URL(worker.url()).host;
});

test.afterAll(async () => {
  await context?.close();
});

/** Página interna de la extensión, con acceso a las APIs chrome.* */
async function extensionPage(path = 'options.html'): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/${path}`);
  return page;
}

test('puntúa la noticia en local y la pasa a la PWA para el análisis completo', async () => {
  const article = await context.newPage();
  await article.goto(ARTICLE);

  const ext = await extensionPage();
  const tabId = await ext.evaluate(async (url) => {
    const [tab] = await chrome.tabs.query({ url: `${url}*` });
    return tab!.id!;
  }, ARTICLE);

  // 1. Lo mismo que hace el popup al abrirse: pedir el análisis de la pestaña.
  const reply = await ext.evaluate(
    (id) => chrome.runtime.sendMessage({ type: 'analyze', tabId: id }),
    tabId,
  );
  expect(reply).toEqual({ ok: true });

  // 2. Resultado local (modo sin servidor): Readability en la página real + puntuación.
  const state = await ext.evaluate(async (id) => {
    const key = `tab:${id}`;
    return (await chrome.storage.session.get(key))[key] as Extract<TabState, { status: 'local' }>;
  }, tabId);
  expect(state.status).toBe('local');
  expect(state.page.author).toBe('Ana García');
  expect(state.page.links).toEqual(
    expect.arrayContaining(['https://www.nature.com/articles/x', 'https://www.who.int/news']),
  );
  expect(state.quick.score).toBeGreaterThan(0);

  // 3. El icono muestra la nota provisional (~NN).
  const badge = await ext.evaluate((id) => chrome.action.getBadgeText({ tabId: id }), tabId);
  expect(badge).toBe(`~${state.quick.score}`);

  // 4. El popup ofrece el análisis completo y abre la PWA con la página ya extraída.
  const popup = await extensionPage(`popup.html?tabId=${tabId}`);
  await expect(popup.getByText('Estimación rápida (solo contenido)')).toBeVisible();
  const [pwa] = await Promise.all([
    context.waitForEvent('page'),
    popup.getByRole('button', { name: 'Análisis completo en Confinet' }).click(),
  ]);

  // 5. La PWA analiza sin descargar nada (no necesita Puter) y lo guarda en el historial.
  await expect(pwa).toHaveURL(/\/confinet\/resultado\//, { timeout: 20_000 });
  await expect(pwa.getByText('Desglose')).toBeVisible();
  await expect(pwa.getByText('Un estudio confirma la eficacia de la vacuna')).toBeVisible();
  await pwa
    .getByRole('button', { name: /Contenido/ })
    .first()
    .click()
    .catch(() => undefined);
  await expect(pwa.getByText(/firmado por "Ana García"/)).toBeVisible();

  await pwa.goto('http://localhost:4174/confinet/historial');
  await expect(pwa.getByText('Un estudio confirma la eficacia de la vacuna')).toBeVisible();
});

test('rechaza páginas internas del navegador', async () => {
  const ext = await extensionPage();
  const reply = await ext.evaluate(async () => {
    const tab = await chrome.tabs.create({ url: 'chrome://version' });
    return chrome.runtime.sendMessage({ type: 'analyze', tabId: tab.id });
  });
  expect(reply).toEqual({ ok: false, error: 'Esta página no se puede analizar.' });
});
