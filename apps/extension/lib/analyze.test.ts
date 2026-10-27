import { describe, expect, it } from 'vitest';
import { isAnalyzableUrl, looksLikeArticle } from './analyze';

describe('isAnalyzableUrl', () => {
  it.each([
    ['https://elpais.com/x', true],
    ['http://example.org/', true],
    ['chrome://extensions', false],
    ['https://chromewebstore.google.com/detail/x', false],
    ['file:///C:/a.html', false],
    [undefined, false],
  ])('%s → %s', (url, expected) => {
    expect(isAnalyzableUrl(url)).toBe(expected);
  });
});

describe('looksLikeArticle', () => {
  it.each([
    ['https://elpais.com/ciencia/2026-09-30/un-estudio-confirma-la-eficacia.html', true],
    ['https://www.bbc.com/news/articles/c1234567890', true],
    ['https://www.bbc.com/news/world/europe/story', true],
    ['https://elpais.com/', false],
    ['https://example.org/contacto', false],
  ])('%s → %s', (url, expected) => {
    expect(looksLikeArticle(url)).toBe(expected);
  });
});
