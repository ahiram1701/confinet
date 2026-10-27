import type { Pillar } from './types';

/** Peso de cada pilar en la puntuación global (suman 1). */
export const PILLAR_WEIGHTS: Record<Pillar, number> = {
  source: 0.35,
  content: 0.3,
  ai: 0.35,
};

export const PILLAR_LABELS: Record<Pillar, string> = {
  source: 'Fuente',
  content: 'Contenido',
  ai: 'Análisis IA',
};

/**
 * Catálogo de todas las señales posibles. El peso es relativo dentro de su pilar.
 * Sirve para calcular la certeza: peso medido / peso posible.
 */
export const SIGNAL_CATALOG = {
  'source.https': { pillar: 'source', weight: 0.5, label: 'Conexión segura (HTTPS)' },
  'source.reputation': { pillar: 'source', weight: 3, label: 'Reputación del medio' },
  'source.domainAge': { pillar: 'source', weight: 1.5, label: 'Antigüedad del dominio' },
  'source.transparency': { pillar: 'source', weight: 1, label: 'Transparencia del sitio' },

  'content.author': { pillar: 'content', weight: 1.5, label: 'Autor identificado' },
  'content.date': { pillar: 'content', weight: 1, label: 'Fecha de publicación' },
  'content.citations': { pillar: 'content', weight: 2, label: 'Enlaces a fuentes' },
  'content.clickbait': { pillar: 'content', weight: 1.5, label: 'Titular sensacionalista' },
  'content.shouting': { pillar: 'content', weight: 1, label: 'Mayúsculas y exclamaciones' },
  'content.ads': { pillar: 'content', weight: 0.75, label: 'Densidad de publicidad' },
  'content.length': { pillar: 'content', weight: 0.75, label: 'Extensión del contenido' },

  'ai.assessment': { pillar: 'ai', weight: 2, label: 'Valoración general de la IA' },
  'ai.tone': { pillar: 'ai', weight: 1.5, label: 'Tono' },
  'ai.fallacies': { pillar: 'ai', weight: 1.5, label: 'Falacias detectadas' },
  'ai.claimsSourced': { pillar: 'ai', weight: 1.5, label: 'Afirmaciones respaldadas' },
  'ai.factcheck': { pillar: 'ai', weight: 3, label: 'Verificaciones externas' },
} as const satisfies Record<string, { pillar: Pillar; weight: number; label: string }>;

export type SignalId = keyof typeof SIGNAL_CATALOG;
