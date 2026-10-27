import { z } from 'zod';

/**
 * Contrato que debe cumplir CUALQUIER modelo de lenguaje (Claude, GPT, Gemini, Llama...).
 * El motor de puntuación solo conoce este esquema, nunca el proveedor.
 */
export const LlmAnalysisSchema = z.object({
  tone: z
    .enum(['neutral', 'emotional', 'sensationalist', 'propagandistic'])
    .describe('Tono predominante del texto'),
  fallacies: z
    .array(
      z.object({
        type: z.string().describe('Nombre de la falacia, p. ej. "ad hominem"'),
        quote: z.string().describe('Fragmento literal breve donde aparece'),
        explanation: z.string(),
      }),
    )
    .max(10),
  claims: z
    .array(
      z.object({
        text: z.string().describe('Afirmación factual principal, en una frase'),
        verifiable: z.boolean().describe('¿Se puede comprobar con datos?'),
        sourced: z.boolean().describe('¿El texto cita una fuente para ella?'),
      }),
    )
    .max(10),
  summary: z.string().describe('Resumen neutral de 1–2 frases'),
  assessment: z
    .number()
    .min(0)
    .max(100)
    .describe('Fiabilidad estimada del texto, 0 (nada) a 100 (muy alta)'),
  reasoning: z.string().describe('Justificación breve de la valoración'),
});

export type LlmAnalysis = z.infer<typeof LlmAnalysisSchema>;
