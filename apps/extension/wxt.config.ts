import { defineConfig } from 'wxt';

// URL de la PWA (la API vive en `${APP_URL}/api`). En CI se define WXT_APP_URL por entorno.
const APP_URL = (process.env.WXT_APP_URL ?? 'http://localhost:5173').replace(/\/$/, '');

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifestVersion: 3,
  manifest: {
    name: 'Confinet — ¿Te puedes fiar?',
    short_name: 'Confinet',
    description:
      'Mide la confianza de la información que lees: fuente, contenido y análisis con IA.',
    default_locale: undefined,
    // Permisos mínimos: solo actuamos sobre la pestaña cuando el usuario abre la extensión.
    permissions: ['activeTab', 'scripting', 'storage'],
    host_permissions: [`${APP_URL}/*`],
    // Análisis automático (opcional): se pide en tiempo de ejecución desde las opciones.
    optional_host_permissions: ['https://*/*', 'http://*/*'],
    // La PWA envía el token de sesión a la extensión con chrome.runtime.sendMessage.
    externally_connectable: { matches: [`${APP_URL}/*`] },
    action: { default_title: 'Analizar con Confinet' },
  },
});
