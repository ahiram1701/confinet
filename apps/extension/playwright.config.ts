import { defineConfig } from '@playwright/test';

// E2E de la extensión cargada en un Chromium real (aislado, no toca el navegador del usuario).
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  globalSetup: './e2e/build-extension.ts',
  use: { trace: 'retain-on-failure' },
  webServer: [
    {
      // PWA sin servidor, igual que en GitHub Pages pero en local.
      command:
        'pnpm --filter @confinet/web build:static && pnpm --filter @confinet/web exec vite preview --port 4174 --strictPort --base /confinet/',
      url: 'http://localhost:4174/confinet/',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      command: 'node e2e/fixture-server.mjs',
      url: 'http://localhost:4180/noticia',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
