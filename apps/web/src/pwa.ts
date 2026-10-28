import { registerSW } from 'virtual:pwa-register';

const HOUR = 60 * 60 * 1000;

/**
 * Registra el service worker y busca versiones nuevas cada hora y al volver a la pestaña.
 * Con `registerType: 'autoUpdate'`, cuando hay una versión nueva la página se recarga sola:
 * no hace falta cerrar la PWA ni forzar la recarga.
 */
export function setupPwaUpdates() {
  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => {
        if (navigator.onLine && !registration.installing) registration.update().catch(() => {});
      };
      setInterval(check, HOUR);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    },
  });
}
