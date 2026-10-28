import { defineConfig } from 'wxt';

// URL de la PWA (la API vive en `${APP_URL}/api`). En CI se define WXT_APP_URL por entorno.
const APP_URL = (process.env.WXT_APP_URL ?? 'http://localhost:5173').replace(/\/$/, '');

// Solo para los tests E2E: en un test no hay clic real que conceda activeTab, así que la build
// de prueba puede leer cualquier página. La build publicada nunca lleva este permiso.
const E2E = process.env.WXT_E2E === 'true';

// La CI calcula la versión de cada release (último tag ext-v* + 1) y la inyecta aquí, sin
// necesidad de hacer commit en main. En local se usa la de package.json.
const VERSION = process.env.WXT_VERSION;

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  // La build de pruebas va a otra carpeta para no confundirla nunca con la publicable.
  outDir: E2E ? '.output-e2e' : '.output',
  manifestVersion: 3,
  manifest: {
    name: 'Confinet — ¿Te puedes fiar?',
    short_name: 'Confinet',
    ...(VERSION ? { version: VERSION } : {}),
    description:
      'Mide la confianza de la información que lees: fuente, contenido y análisis con IA.',
    default_locale: undefined,
    // Permisos mínimos: solo actuamos sobre la pestaña cuando el usuario abre la extensión.
    // `alarms`: comprobar una vez al día si hay versión nueva (no muestra ningún aviso al instalar).
    permissions: ['activeTab', 'scripting', 'storage', 'alarms'],
    host_permissions: E2E ? ['<all_urls>'] : [`${APP_URL}/*`],
    // Análisis automático (opcional): se pide en tiempo de ejecución desde las opciones.
    optional_host_permissions: ['https://*/*', 'http://*/*'],
    // La PWA envía el token de sesión a la extensión con chrome.runtime.sendMessage.
    externally_connectable: { matches: [`${APP_URL}/*`] },
    action: { default_title: 'Analizar con Confinet' },
  },
});
