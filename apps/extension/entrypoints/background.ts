import { analyzeTab, isAnalyzableUrl, looksLikeArticle } from '../lib/analyze';
import { APP_URL, getSettings, saveSettings } from '../lib/config';
import { clearTabState, type Message } from '../lib/state';
import { checkForUpdate } from '../lib/updates';

export default defineBackground(() => {
  // ¿Hay versión nueva? Al instalar/arrancar y una vez al día (solo instalación desde GitHub).
  browser.runtime.onInstalled.addListener(() => void checkForUpdate());
  browser.runtime.onStartup.addListener(() => void checkForUpdate());
  browser.alarms.create('check-update', { periodInMinutes: 24 * 60 });
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'check-update') void checkForUpdate();
  });

  // Peticiones del popup.
  browser.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
    if (message.type !== 'analyze') return;
    browser.tabs
      .get(message.tabId)
      .then((tab) => {
        if (!isAnalyzableUrl(tab.url)) throw new Error('Esta página no se puede analizar.');
        return analyzeTab(message.tabId, tab.url, { force: message.force });
      })
      .then(() => sendResponse({ ok: true }))
      .catch((error: Error) => sendResponse({ ok: false, error: error.message }));
    return true; // respuesta asíncrona
  });

  // La PWA nos envía el token tras "Conectar extensión". Solo aceptamos mensajes de su origen.
  browser.runtime.onMessageExternal.addListener((message: Message, sender, sendResponse) => {
    if (sender.origin !== APP_URL || message.type !== 'confinet:token') return;
    if (typeof message.token !== 'string' || !message.token.startsWith('cnf_')) {
      sendResponse({ ok: false });
      return;
    }
    saveSettings({ token: message.token }).then(() => sendResponse({ ok: true }));
    return true;
  });

  // Al navegar, el resultado anterior ya no vale.
  browser.tabs.onUpdated.addListener(async (tabId, change, tab) => {
    if (change.url) {
      await clearTabState(tabId);
      await browser.action.setBadgeText({ tabId, text: '' });
    }
    if (change.status !== 'complete' || !isAnalyzableUrl(tab.url)) return;

    // Modo automático (opcional): solo si el usuario concedió permiso sobre los sitios web.
    const { autoMode } = await getSettings();
    if (!autoMode || !looksLikeArticle(tab.url)) return;
    const granted = await browser.permissions.contains({
      origins: [new URL(tab.url).origin + '/*'],
    });
    // Sin IA en automático: no queremos gastar la cuota en cada página visitada.
    if (granted) await analyzeTab(tabId, tab.url, { skipAi: true });
  });

  browser.tabs.onRemoved.addListener((tabId) => clearTabState(tabId));
});
