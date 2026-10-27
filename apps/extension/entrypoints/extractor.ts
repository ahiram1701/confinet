import { extractFromDocument } from '@confinet/extract/dom';

/**
 * Script inyectado bajo demanda con chrome.scripting.executeScript (permiso activeTab).
 * Su valor de retorno (la página extraída) llega al service worker.
 */
export default defineUnlistedScript(() => extractFromDocument(document, location.href));
