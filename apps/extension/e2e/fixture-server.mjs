// Sirve una noticia de ejemplo (el fixture del extractor) para el E2E de la extensión.
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';

const html = await readFile(
  new URL('../../../packages/extract/src/__fixtures__/news.html', import.meta.url),
);
const port = Number(process.env.FIXTURE_PORT ?? 4180);

createServer((req, res) => {
  if (req.url?.startsWith('/noticia')) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html);
  } else {
    res.writeHead(404).end();
  }
}).listen(port, () => console.log(`fixture en http://localhost:${port}/noticia`));
