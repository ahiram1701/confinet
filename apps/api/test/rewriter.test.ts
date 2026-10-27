import { extractWithRewriter } from '@confinet/extract/rewriter';
import { describe, expect, it } from 'vitest';
import html from '../../../packages/extract/src/__fixtures__/news.html?raw';

describe('extractWithRewriter (HTMLRewriter en Workers)', () => {
  it('extrae lo mismo que el extractor DOM en lo esencial', async () => {
    const res = new Response(html, { headers: { 'content-type': 'text/html' } });
    const page = await extractWithRewriter(res, 'https://diario.example/ciencia/vacuna');
    expect(page.author).toBe('Ana García');
    expect(page.publishedAt).toBe('2026-09-01T10:00:00Z');
    expect(page.links).toEqual(
      expect.arrayContaining(['https://www.nature.com/articles/x', 'https://www.who.int/news']),
    );
    expect(page.hasAboutPage).toBe(true);
    expect(page.hasContactPage).toBe(true);
    expect(page.adCount).toBe(1);
    expect(page.text).toContain('protección & recomiendan');
    expect(page.lang).toBe('es');
  });
});
