import { copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * GitHub Pages no sabe que es una SPA: para una ruta como /confinet/historial devuelve 404.html.
 * Si 404.html es una copia de index.html, la app arranca igualmente y el router se encarga.
 */
function spaFallback(): Plugin {
  let outDir = 'dist';
  return {
    name: 'confinet-spa-404',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    async closeBundle() {
      await copyFile(resolve(outDir, 'index.html'), resolve(outDir, '404.html'));
    },
  };
}

export default defineConfig(({ mode }) => {
  // GitHub Pages sirve el proyecto en /confinet/ (modo "static", ver .env.static);
  // local y Cloudflare, en /.
  const base = loadEnv(mode, process.cwd(), '').VITE_BASE || '/';
  return {
    base,
    plugins: [
      react(),
      spaFallback(),
      VitePWA({
        registerType: 'autoUpdate',
        // El registro lo hace src/pwa.ts, que además busca versiones nuevas periódicamente.
        injectRegister: false,
        includeAssets: ['logo.svg', 'apple-touch-icon.png', 'favicon-32.png'],
        manifest: {
          name: 'Confinet — ¿Te puedes fiar?',
          short_name: 'Confinet',
          description: 'Mide la confianza de la información que lees en internet.',
          lang: 'es',
          // Rutas relativas al manifest: funcionan tanto en / como en /confinet/.
          start_url: '.',
          scope: '.',
          display: 'standalone',
          background_color: '#f7f8fa',
          theme_color: '#2f5bea',
          icons: [
            { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'pwa-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          // Android: "Compartir → Confinet" desde cualquier app abre compartir?url=…
          share_target: {
            action: 'compartir',
            method: 'GET',
            params: { title: 'title', text: 'text', url: 'url' },
          },
        },
        workbox: {
          navigateFallback: `${base}index.html`,
          // La API nunca se cachea en el service worker: los análisis deben ser frescos.
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [],
          cleanupOutdatedCaches: true,
        },
      }),
    ],
    server: {
      port: 5173,
      // Mismo origen que en producción (Pages reenvía /api/* al Worker).
      proxy: { '/api': process.env.API_URL ?? 'http://localhost:8788' },
    },
  };
});
