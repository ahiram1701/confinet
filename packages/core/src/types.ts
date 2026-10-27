import type { SignalId } from './catalog';

/** Pilares de la puntuación de confianza. */
export type Pillar = 'source' | 'content' | 'ai';

/** Nivel de confianza mostrado al usuario. */
export type TrustLevel = 'high' | 'medium' | 'low' | 'unknown';

/**
 * Una señal medida. `value` va de 0 (nada fiable) a 1 (muy fiable).
 * Toda señal lleva una explicación legible: la puntuación nunca es una caja negra.
 */
export interface Signal {
  id: SignalId;
  pillar: Pillar;
  value: number;
  weight: number;
  explanation: string;
  evidence?: string[];
}

/** Página ya extraída (por la extensión con Readability o por el Worker con HTMLRewriter). */
export interface ExtractedPage {
  url: string;
  title: string;
  author?: string;
  publishedAt?: string;
  siteName?: string;
  lang?: string;
  text: string;
  wordCount: number;
  /** Enlaces salientes encontrados en el cuerpo del artículo (URLs absolutas). */
  links: string[];
  /** Nº de elementos publicitarios detectados (iframes de redes de anuncios, contenedores "ad"). */
  adCount: number;
  /** Enlaces de navegación a páginas de transparencia ("Quiénes somos", "Contacto"...). */
  hasAboutPage: boolean;
  hasContactPage: boolean;
}

export type ReputationRating = 'reliable' | 'mixed' | 'unreliable' | 'satire' | 'unknown';

export interface DomainReputation {
  domain: string;
  rating: ReputationRating;
  source: string;
  notes?: string;
}

export type FactCheckVerdict = 'false' | 'misleading' | 'true' | 'unknown';

export interface FactCheckMatch {
  claim: string;
  verdict: FactCheckVerdict;
  rating: string;
  publisher: string;
  url: string;
}

export interface PillarResult {
  pillar: Pillar;
  score: number | null;
  signals: Signal[];
}

export interface TrustScore {
  /** 0–100, o null si no hay datos suficientes. */
  score: number | null;
  level: TrustLevel;
  /** 0–1: proporción del peso total de señales que se pudo medir. */
  certainty: number;
  pillars: Record<Pillar, PillarResult>;
  /** Límites aplicados (p. ej. un fact-check desmentido limita la puntuación máxima). */
  caps: { reason: string; max: number }[];
}
