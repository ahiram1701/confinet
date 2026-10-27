import { defineConfig, devices } from '@playwright/test';

// E2E de la versión sin servidor (GitHub Pages): build estático servido bajo /confinet/.
export default defineConfig({
  testDir: './e2e-static',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: 'playwright-report-static' }]]
    : 'list',
  use: { baseURL: 'http://localhost:4174/confinet/', trace: 'retain-on-failure' },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command:
      'pnpm run build:static && pnpm exec vite preview --port 4174 --strictPort --base /confinet/',
    url: 'http://localhost:4174/confinet/',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
