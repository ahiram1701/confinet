import { signal } from '../signal';
import type { ExtractedPage, Signal } from '../types';
import { registrableDomain } from '../url';

/** Patrones típicos de titulares "cebo" (español e inglés). */
const CLICKBAIT_PATTERNS: RegExp[] = [
  /no (te )?(lo )?(vas a )?creer(á|a)s/i,
  /you won'?t believe/i,
  /lo que (pas[óo]|ocurri[óo]) (despu[ée]s|a continuaci[óo]n)/i,
  /what happened next/i,
  /(impactante|incre[íi]ble|escandaloso|brutal|urgente|[úu]ltima hora)/i,
  /(shocking|unbelievable|mind-?blowing|jaw-?dropping)/i,
  /(nadie|no one|nobody) (te )?(habla|cuenta|dice|talks?|tells?)/i,
  /(los m[ée]dicos|doctors) (odian|hate)/i,
  /(este|this) (truco|simple trick)/i,
  /^\d+ (cosas|razones|motivos|things|reasons|ways)/i,
  /[!?]{2,}/,
];

const COMMON_AD_ESTIMATE_PER_1000_WORDS = 3;

export function contentSignals(page: ExtractedPage): Signal[] {
  const signals: Signal[] = [];

  signals.push(
    page.author
      ? signal('content.author', 1, 'signal.content.author.yes', { author: page.author })
      : signal('content.author', 0, 'signal.content.author.no'),
  );

  signals.push(
    page.publishedAt
      ? signal('content.date', 1, 'signal.content.date.yes', { date: page.publishedAt })
      : signal('content.date', 0, 'signal.content.date.no'),
  );

  // Fuentes externas: dominios distintos al del propio sitio.
  const ownDomain = registrableDomain(page.url);
  const externalDomains = [
    ...new Set(
      page.links.map((link) => registrableDomain(link)).filter((d) => d && d !== ownDomain),
    ),
  ];
  const citations = externalDomains.length;
  signals.push(
    signal(
      'content.citations',
      citations === 0 ? 0.15 : citations <= 2 ? 0.6 : 1,
      citations === 0 ? 'signal.content.citations.none' : 'signal.content.citations.some',
      { n: citations },
      externalDomains.slice(0, 10),
    ),
  );

  const clickbaitHits = CLICKBAIT_PATTERNS.filter((re) => re.test(page.title)).map(
    (re) => page.title.match(re)?.[0] ?? '',
  );
  signals.push(
    signal(
      'content.clickbait',
      1 - clickbaitHits.length * 0.4,
      clickbaitHits.length === 0 ? 'signal.content.clickbait.no' : 'signal.content.clickbait.yes',
      undefined,
      clickbaitHits,
    ),
  );

  const { capsRatio, exclamationsPer1000 } = shoutingStats(`${page.title}\n${page.text}`);
  const shoutingPenalty = Math.max(0, capsRatio - 0.05) * 5 + exclamationsPer1000 / 20;
  signals.push(
    signal(
      'content.shouting',
      1 - shoutingPenalty,
      shoutingPenalty < 0.2 ? 'signal.content.shouting.ok' : 'signal.content.shouting.abuse',
      { pct: Math.round(capsRatio * 100) },
    ),
  );

  if (page.wordCount > 0) {
    const adsPer1000 = (page.adCount / page.wordCount) * 1000;
    signals.push(
      signal(
        'content.ads',
        1 - Math.max(0, adsPer1000 - COMMON_AD_ESTIMATE_PER_1000_WORDS) / 10,
        page.adCount === 0 ? 'signal.content.ads.none' : 'signal.content.ads.some',
        { n: page.adCount },
      ),
    );
  }

  signals.push(
    signal(
      'content.length',
      page.wordCount < 150 ? 0.3 : page.wordCount < 400 ? 0.7 : 1,
      page.wordCount < 150 ? 'signal.content.length.short' : 'signal.content.length.ok',
      { n: page.wordCount },
    ),
  );

  return signals;
}

/** Proporción de palabras en MAYÚSCULAS (≥3 letras) y exclamaciones por cada 1000 palabras. */
export function shoutingStats(text: string) {
  const words = text.match(/\p{L}{3,}/gu) ?? [];
  if (words.length === 0) return { capsRatio: 0, exclamationsPer1000: 0 };
  const caps = words.filter((w) => w === w.toUpperCase() && w !== w.toLowerCase()).length;
  const exclamations = (text.match(/!/g) ?? []).length;
  return {
    capsRatio: caps / words.length,
    exclamationsPer1000: (exclamations / words.length) * 1000,
  };
}
