// Genera las imágenes de la ficha en las tiendas (Edge Add-ons y Chrome Web Store) en docs/tienda/.
// Uso: node scripts/gen-store-assets.mjs
import { mkdir, readFile } from 'node:fs/promises';
import sharp from 'sharp';

const root = (p) => new URL(`../${p}`, import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const out = (name) => root(`docs/tienda/${name}`);
await mkdir(root('docs/tienda'), { recursive: true });

const logo = await readFile(root('assets/logo.svg'));

// Logo de la extensión: 300 × 300 (Edge) y 128 × 128 (Chrome Web Store).
for (const size of [300, 128]) {
  await sharp(logo, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(out(`logo-${size}.png`));
}

// Capturas: 1280 × 800, recortadas desde arriba de las capturas de escritorio de la guía.
const shots = ['resultado', 'inicio', 'historial', 'cuenta'];
for (const [i, name] of shots.entries()) {
  await sharp(root(`docs/screenshots/${name}-escritorio.png`))
    .resize(1280, 800, { fit: 'cover', position: 'top' })
    .png()
    .toFile(out(`captura-${i + 1}-${name}.png`));
}

// Mosaico promocional pequeño: 440 × 280.
const tile = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="440" height="280">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#3b6cff"/><stop offset="1" stop-color="#1f3fb8"/>
  </linearGradient></defs>
  <rect width="440" height="280" fill="url(#g)"/>
  <text x="200" y="135" font-family="Segoe UI, Arial, sans-serif" font-size="44" font-weight="700" fill="#fff">Confinet</text>
  <text x="200" y="172" font-family="Segoe UI, Arial, sans-serif" font-size="20" fill="#dfe7ff">¿Te puedes fiar?</text>
</svg>`);
const tileLogo = await sharp(logo, { density: 384 }).resize(140, 140).png().toBuffer();
await sharp(tile)
  .composite([{ input: tileLogo, left: 40, top: 70 }])
  .png()
  .toFile(out('mosaico-440x280.png'));

console.log('Imágenes generadas en docs/tienda/');
