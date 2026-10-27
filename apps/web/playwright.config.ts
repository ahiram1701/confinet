import { defineConfig, devices } from '@playwright/test';

// Puerto configurable por si el 5173 está ocupado por otro proyecto (E2E_WEB_PORT).
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 5173);

// Levanta la API (Workers local + D1 local) y la PWA, y prueba el flujo completo.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: `http://localhost:${WEB_PORT}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: `pnpm --filter @confinet/api db:migrate:local && pnpm --filter @confinet/api exec wrangler dev --port 8788 --var LLM_PROVIDER:mock --var ENABLE_DEV_LOGIN:true --var APP_URL:http://localhost:${WEB_PORT}`,
      url: 'http://localhost:8788/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `pnpm --filter @confinet/web exec vite --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
