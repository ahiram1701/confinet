// Genera los iconos PNG de la PWA y de la extensión a partir de assets/logo.svg.
// Uso: node scripts/gen-icons.mjs
import { mkdir, readFile } from 'node:fs/promises';
import sharp from 'sharp';

const svg = await readFile(new URL('../assets/logo.svg', import.meta.url));
const targets = [
  [
    'apps/web/public',
    [
      ['pwa-192.png', 192],
      ['pwa-512.png', 512],
      ['apple-touch-icon.png', 180],
      ['favicon-32.png', 32],
    ],
  ],
  ['apps/extension/public/icon', [16, 32, 48, 128].map((s) => [`${s}.png`, s])],
];

for (const [dir, files] of targets) {
  await mkdir(new URL(`../${dir}/`, import.meta.url), { recursive: true });
  for (const [name, size] of files) {
    await sharp(svg, { density: 384 })
      .resize(size, size)
      .png()
      .toFile(new URL(`../${dir}/${name}`, import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
    console.log(`${dir}/${name}`);
  }
}
// Versión "maskable" con margen de seguridad para Android.
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#2f5bea' } })
  .composite([
    {
      input: await sharp(svg, { density: 384 }).resize(400, 400).png().toBuffer(),
      gravity: 'center',
    },
  ])
  .png()
  .toFile(
    new URL('../apps/web/public/pwa-maskable-512.png', import.meta.url).pathname.replace(
      /^\/([A-Z]:)/,
      '$1',
    ),
  );
console.log('apps/web/public/pwa-maskable-512.png');
