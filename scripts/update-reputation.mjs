#!/usr/bin/env node
// Regenera packages/core/data/reputation-wikipedia.json a partir de la lista
// «Wikipedia:Reliable sources/Perennial sources» (CC BY-SA 4.0).
// Uso: node scripts/update-reputation.mjs   (Node 23.6+: importa el lector en TypeScript)
import { writeFile } from 'node:fs/promises';
import { parseRsp, toDomainMap } from '../packages/core/src/reputation/rsp.ts';

const PAGE = 'Wikipedia:Reliable_sources/Perennial_sources';
const SUBPAGES = [1, 2, 3, 4, 5, 6, 7, 8];
const OUT = new URL('../packages/core/data/reputation-wikipedia.json', import.meta.url);
const HEADERS = { 'user-agent': 'Confinet/1.0 (https://github.com/ahiram1701/confinet)' };

const entries = [];
for (const n of SUBPAGES) {
  const url = `https://en.wikipedia.org/w/index.php?title=${PAGE}/${n}&action=raw`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const rows = parseRsp(await res.text());
  if (rows.length === 0) throw new Error(`${url}: ninguna fila; ¿ha cambiado el formato?`);
  entries.push(...rows);
}

const domains = toDomainMap(entries);
const data = {
  source: 'Wikipedia: Reliable sources/Perennial sources',
  url: `https://en.wikipedia.org/wiki/${PAGE}`,
  license: 'CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)',
  generatedAt: new Date().toISOString().slice(0, 10),
  domains,
};
await writeFile(OUT, `${JSON.stringify(data, null, 1)}\n`);

const count = {};
for (const [rating] of Object.values(domains)) count[rating] = (count[rating] ?? 0) + 1;
console.log(`${entries.length} fuentes, ${Object.keys(domains).length} dominios:`, count);
