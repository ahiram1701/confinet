import type { Pillar } from './types';

/** Peso de cada pilar en la puntuación global (suman 1). */
export const PILLAR_WEIGHTS: Record<Pillar, number> = {
  source: 0.35,
  content: 0.3,
  ai: 0.35,
};

/**
 * Catálogo de todas las señales posibles. El peso es relativo dentro de su pilar.
 * Sirve para calcular la certeza: peso medido / peso posible. Los nombres de cada señal están
 * en el diccionario de @confinet/i18n (`signal.<id>`).
 */
export const SIGNAL_CATALOG = {
  'source.https': { pillar: 'source', weight: 0.5 },
  'source.reputation': { pillar: 'source', weight: 3 },
  'source.domainAge': { pillar: 'source', weight: 1.5 },
  'source.transparency': { pillar: 'source', weight: 1 },

  'content.author': { pillar: 'content', weight: 1.5 },
  'content.date': { pillar: 'content', weight: 1 },
  'content.citations': { pillar: 'content', weight: 2 },
  'content.clickbait': { pillar: 'content', weight: 1.5 },
  'content.shouting': { pillar: 'content', weight: 1 },
  'content.ads': { pillar: 'content', weight: 0.75 },
  'content.length': { pillar: 'content', weight: 0.75 },

  'ai.assessment': { pillar: 'ai', weight: 2 },
  'ai.tone': { pillar: 'ai', weight: 1.5 },
  'ai.fallacies': { pillar: 'ai', weight: 1.5 },
  'ai.claimsSourced': { pillar: 'ai', weight: 1.5 },
  'ai.factcheck': { pillar: 'ai', weight: 3 },
} as const satisfies Record<string, { pillar: Pillar; weight: number }>;

export type SignalId = keyof typeof SIGNAL_CATALOG;
