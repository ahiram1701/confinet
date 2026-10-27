import { describe, expect, it } from 'vitest';
import {
  aiSignals,
  computeTrustScore,
  contentSignals,
  normalizeUrl,
  normalizeVerdict,
  registrableDomain,
  sourceSignals,
  type ExtractedPage,
  type LlmAnalysis,
} from './index';

const words = (n: number) => Array.from({ length: n }, (_, i) => `palabra${i}`).join(' ');

const reliablePage: ExtractedPage = {
  url: 'https://www.ejemplo-noticias.es/ciencia/vacunas',
  title: 'Un estudio confirma la eficacia de la nueva vacuna',
  author: 'Ana García',
  publishedAt: '2026-09-01',
  text: words(800),
  wordCount: 800,
  links: ['https://www.who.int/x', 'https://www.nature.com/y', 'https://www.ine.es/z'],
  adCount: 1,
  hasAboutPage: true,
  hasContactPage: true,
};

const clickbaitPage: ExtractedPage = {
  url: 'http://noticias-virales.xyz/post',
  title: 'NO VAS A CREER lo que pasó después!!! IMPACTANTE',
  text: 'ESTO ES INCREÍBLE!!! NADIE TE LO CUENTA!!! ' + words(80),
  wordCount: 90,
  links: [],
  adCount: 12,
  hasAboutPage: false,
  hasContactPage: false,
};

const goodAi: LlmAnalysis = {
  tone: 'neutral',
  fallacies: [],
  claims: [{ text: 'La vacuna reduce hospitalizaciones un 90%', verifiable: true, sourced: true }],
  summary: 'Estudio sobre vacuna.',
  assessment: 90,
  reasoning: 'Cita estudios revisados por pares.',
};

describe('computeTrustScore', () => {
  it('da confianza alta a una noticia firmada, con fuentes y de un medio fiable', () => {
    const trust = computeTrustScore([
      ...sourceSignals({
        url: reliablePage.url,
        reputation: { domain: 'ejemplo-noticias.es', rating: 'reliable', source: 'test' },
        domainAgeDays: 5000,
        hasAboutPage: true,
        hasContactPage: true,
      }),
      ...contentSignals(reliablePage),
      ...aiSignals(goodAi),
    ]);
    expect(trust.level).toBe('high');
    expect(trust.score).toBeGreaterThanOrEqual(85);
    expect(trust.certainty).toBeGreaterThan(0.8);
  });

  it('da confianza baja a un titular clickbait sin autor ni fuentes', () => {
    const trust = computeTrustScore([
      ...sourceSignals({ url: clickbaitPage.url, domainAgeDays: 10 }),
      ...contentSignals(clickbaitPage),
    ]);
    expect(trust.level).toBe('low');
    expect(trust.pillars.ai.score).toBeNull();
  });

  it('renormaliza cuando falta el pilar de IA y lo refleja en la certeza', () => {
    const withoutAi = computeTrustScore([...contentSignals(reliablePage)]);
    const withAi = computeTrustScore([...contentSignals(reliablePage), ...aiSignals(goodAi)]);
    expect(withoutAi.score).not.toBeNull();
    expect(withoutAi.certainty).toBeLessThan(withAi.certainty);
  });

  it('limita la puntuación si un verificador desmiente una afirmación', () => {
    const trust = computeTrustScore([
      ...contentSignals(reliablePage),
      ...aiSignals(goodAi, [
        {
          claim: 'x',
          verdict: 'false',
          rating: 'Falso',
          publisher: 'Maldita',
          url: 'https://maldita.es',
        },
      ]),
    ]);
    expect(trust.score).toBeLessThanOrEqual(35);
    expect(trust.caps).toHaveLength(1);
  });

  it('no puntúa si apenas hay señales', () => {
    const trust = computeTrustScore(sourceSignals({ url: 'https://a.com' }));
    expect(trust.score).toBeNull();
    expect(trust.level).toBe('unknown');
  });
});

describe('utilidades', () => {
  it('normaliza URLs quitando seguimiento, fragmento y www', () => {
    expect(normalizeUrl('https://WWW.Elpais.com/a/?utm_source=x&b=2&a=1#top')).toBe(
      'https://elpais.com/a?a=1&b=2',
    );
  });

  it('obtiene el dominio registrable', () => {
    expect(registrableDomain('https://noticias.bbc.co.uk/x')).toBe('bbc.co.uk');
  });

  it.each([
    ['Falso', 'false'],
    ['Engañoso', 'misleading'],
    ['Parcialmente falso', 'misleading'],
    ['Mostly True', 'true'],
    ['Sátira', 'unknown'],
  ])('normaliza el veredicto "%s"', (rating, expected) => {
    expect(normalizeVerdict(rating)).toBe(expected);
  });
});

describe('traspaso extensión → PWA', () => {
  it('codifica y decodifica la página (y recorta el texto)', async () => {
    const { decodeHandoff, encodeHandoff, HANDOFF_MAX_TEXT } = await import('./handoff');
    const long = { ...reliablePage, text: 'á'.repeat(HANDOFF_MAX_TEXT + 500) };
    const data = await encodeHandoff({ url: reliablePage.url, extracted: long });
    expect(data).toMatch(/^[\w-]+$/);
    const back = await decodeHandoff(data);
    expect(back.url).toBe(reliablePage.url);
    expect(back.extracted?.author).toBe('Ana García');
    expect(back.extracted?.text).toHaveLength(HANDOFF_MAX_TEXT);
  });

  it('rechaza datos manipulados', async () => {
    const { decodeHandoff } = await import('./handoff');
    await expect(decodeHandoff('no-es-gzip')).rejects.toThrow();
  });
});
