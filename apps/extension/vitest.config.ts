import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

export default defineConfig({
  plugins: [WxtVitest()],
  // Los *.spec.ts de e2e/ son de Playwright, no de Vitest.
  test: { include: ['lib/**/*.test.ts'] },
});
