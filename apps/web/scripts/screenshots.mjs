// Genera las capturas de docs/screenshots a partir de la versión estática.
// Uso (con `vite preview` del build estático en marcha en el puerto 4173):
//   node scripts/screenshots.mjs
import { chromium, devices } from '@playwright/test';

const BASE = process.env.SCREENSHOT_URL ?? 'http://localhost:4173/confinet';
const OUT = new URL('../../../docs/screenshots/', import.meta.url);

// Página de ejemplo, codificada igual que lo hace la extensión (gzip + base64url).
async function handoff() {
  const words = Array.from({ length: 450 }, (_, i) =>
    i % 9 === 0 ? 'Según el informe del INE,' : `dato${i}`,
  ).join(' ');
  const url = 'https://www.rtve.es/noticias/20260920/informe-empleo/123456.shtml';
  const req = {
    url,
    extracted: {
      url,
      title: 'El paro baja por tercer mes consecutivo según el INE',
      author: 'Redacción RTVE',
      publishedAt: '2026-09-20T09:00:00Z',
      lang: 'es',
      text: words,
      wordCount: 450,
      links: ['https://www.ine.es/epa', 'https://www.sepe.es/datos', 'https://www.mites.gob.es/x'],
      adCount: 2,
      hasAboutPage: true,
      hasContactPage: true,
    },
  };
  const gz = await new Response(
    new Blob([JSON.stringify(req)]).stream().pipeThrough(new CompressionStream('gzip')),
  ).arrayBuffer();
  return Buffer.from(gz).toString('base64url');
}

const shots = [
  ['inicio', '/'],
  ['resultado', null],
  ['cuenta', '/cuenta'],
  ['historial', '/historial'],
];

const browser = await chromium.launch();
for (const [suffix, options] of [
  ['escritorio', { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 }],
  ['movil', devices['Pixel 7']],
]) {
  const page = await (
    await browser.newContext({ ...options, colorScheme: 'light', locale: 'es-ES' })
  ).newPage();
  for (const [name, path] of shots) {
    if (path === null) {
      await page.goto(`${BASE}/analizar#data=${await handoff()}`);
      await page.waitForURL(/\/resultado\//);
      await page.getByText('Desglose').waitFor();
    } else {
      await page.goto(`${BASE}${path}`);
      await page.waitForLoadState('networkidle');
    }
    await page.waitForTimeout(500);
    await page.screenshot({
      path: new URL(`${name}-${suffix}.png`, OUT).pathname.replace(/^\/([A-Z]:)/, '$1'),
      fullPage: suffix === 'escritorio' && name === 'resultado',
    });
    console.log(`${name}-${suffix}.png`);
  }
}
await browser.close();
