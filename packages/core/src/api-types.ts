import { z } from 'zod';
import type { LlmAnalysis } from './llm-schema';
import type { FactCheckMatch, TrustScore } from './types';

/** Validación de la página extraída que envía la extensión (no confiamos en el cliente). */
export const ExtractedPageSchema = z.object({
  url: z.string().url().max(2048),
  title: z.string().max(500),
  author: z.string().max(200).optional(),
  publishedAt: z.string().max(100).optional(),
  siteName: z.string().max(200).optional(),
  lang: z.string().max(20).optional(),
  text: z.string().max(200_000),
  wordCount: z.number().int().nonnegative(),
  links: z.array(z.string().max(2048)).max(500),
  adCount: z.number().int().nonnegative(),
  hasAboutPage: z.boolean(),
  hasContactPage: z.boolean(),
});

export const AnalyzeRequestSchema = z.object({
  url: z.string().url().max(2048),
  extracted: ExtractedPageSchema.optional(),
  /** Pedir explícitamente que no se use la IA (más rápido, sin consumir cuota). */
  skipAi: z.boolean().optional(),
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export interface AnalyzeResponse {
  id: string;
  url: string;
  domain: string;
  title: string;
  analyzedAt: string;
  cached: boolean;
  trust: TrustScore;
  ai: (LlmAnalysis & { provider: string; model: string }) | null;
  /** Motivo por el que no hay análisis IA (cuota, error, desactivado...). */
  aiUnavailableReason?: string;
  factChecks: FactCheckMatch[];
}

export interface HistoryItem {
  id: string;
  analysisId: string;
  url: string;
  domain: string;
  title: string;
  score: number | null;
  level: TrustScore['level'];
  viewedAt: string;
}

export interface ApiError {
  error: string;
  code: string;
}
