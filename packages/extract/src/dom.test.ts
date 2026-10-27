import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';
import { extractFromDocument } from './dom';

const html = readFileSync(new URL('./__fixtures__/news.html', import.meta.url), 'utf8');

describe('extractFromDocument', () => {
  const { document } = parseHTML(html);
  const page = extractFromDocument(
    document as unknown as Document,
    'https://diario.example/ciencia/vacuna',
  );

  it('obtiene autor y fecha del JSON-LD', () => {
    expect(page.author).toBe('Ana García');
    expect(page.publishedAt).toBe('2026-09-01T10:00:00Z');
    expect(page.siteName).toBe('Diario Ejemplo');
  });

  it('recoge enlaces del cuerpo en formato absoluto', () => {
    expect(page.links).toContain('https://www.nature.com/articles/x');
    expect(page.links).toContain('https://www.who.int/news');
  });

  it('detecta páginas de transparencia y publicidad', () => {
    expect(page.hasAboutPage).toBe(true);
    expect(page.hasContactPage).toBe(true);
    expect(page.adCount).toBe(1);
  });

  it('extrae el texto del artículo', () => {
    expect(page.text).toContain('ensayo clínico');
    expect(page.wordCount).toBeGreaterThan(50);
    expect(page.lang).toBe('es');
  });
});

describe('HTML sin espacios entre bloques', () => {
  it('no pega palabras de bloques contiguos', () => {
    const { document } = parseHTML(
      '<html><body><article><h1>Título</h1><p>Primer párrafo con bastante texto para Readability.</p><p>Segundo párrafo.</p></article></body></html>',
    );
    const page = extractFromDocument(document as unknown as Document, 'https://a.example/x');
    expect(page.text).not.toMatch(/Readability\.Segundo/);
  });
});
