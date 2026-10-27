import {
  aiSignals,
  computeTrustScore,
  contentSignals,
  normalizeUrl,
  registrableDomain,
  sourceSignals,
  type AnalyzeRequest,
  type AnalyzeResponse,
  type ExtractedPage,
  type FactCheckMatch,
  type TrustScore,
} from '@confinet/core';
import { analyzeWithLlm, chainFromEnv, type LlmConfig, type LlmResult } from '@confinet/llm';
import { and, desc, eq, gt } from 'drizzle-orm';
import type { Db } from '../db';
import { analysis, userHistory } from '../db/schema';
import type { AuthUser, Env } from '../env';
import { sha256Hex } from '../lib/crypto';
import { HttpError } from '../lib/errors';
import { searchFactChecks } from './factcheck';
import { assertPublicUrl, fetchAndExtract } from './fetch-page';
import { getUsage, quotaSubject, recordUsage } from './quota';
import { domainAgeDays } from './rdap';
import { lookupReputation } from './reputation';
import { getUserLlmConfig } from './byok';

export interface AnalyzeContext {
  env: Env;
  db: Db;
  user: AuthUser | null;
  ip: string;
  /** Permite seguir trabajando tras responder (ctx.waitUntil del Worker). */
  waitUntil?: (p: Promise<unknown>) => void;
  /** Inyectable en tests. */
  llm?: typeof analyzeWithLlm;
}

type AnalysisRow = typeof analysis.$inferSelect;

export async function runAnalysis(
  ctx: AnalyzeContext,
  req: AnalyzeRequest,
): Promise<AnalyzeResponse> {
  const { env, db, user } = ctx;
  const url = assertPublicUrl(req.url);
  const normalized = normalizeUrl(url.toString());
  const urlHash = await sha256Hex(normalized);

  const subject = await quotaSubject(env, user, ctx.ip);
  const usage = await getUsage(db, subject.key);
  if (usage.analyses >= subject.limits.analyses) {
    throw new HttpError(429, 'quota_exceeded', 'Has alcanzado el límite diario de análisis');
  }

  const page: ExtractedPage = req.extracted
    ? { ...req.extracted, url: url.toString() }
    : await fetchAndExtract(url.toString());
  const contentHash = await sha256Hex(`${page.title}\n${page.text.slice(0, 20_000)}`);

  // ── LLM disponible: BYOK (ilimitado) y/o cadena del servidor (con cuota) ──
  const byok = user ? await getUserLlmConfig(db, env, user.id) : null;
  const serverAiAllowed = usage.ai < subject.limits.ai;
  const chain: LlmConfig[] = [
    ...(byok ? [byok] : []),
    ...(serverAiAllowed ? chainFromEnv(env as Record<string, string>) : []),
  ];
  const wantAi = !req.skipAi && page.wordCount >= 80;

  // ── Caché: mismo contenido en las últimas N horas ──
  const ttlMs = Number(env.CACHE_TTL_HOURS) * 3600 * 1000;
  const cached = await db
    .select()
    .from(analysis)
    .where(and(eq(analysis.urlHash, urlHash), gt(analysis.createdAt, new Date(Date.now() - ttlMs))))
    .orderBy(desc(analysis.createdAt))
    .get();
  if (
    cached &&
    cached.contentHash === contentHash &&
    (cached.aiJson || !wantAi || chain.length === 0)
  ) {
    await Promise.all([recordUsage(db, subject.key, false), touchHistory(db, user, cached.id)]);
    return rowToResponse(
      cached,
      true,
      wantAi && !cached.aiJson ? unavailableReason(serverAiAllowed) : undefined,
    );
  }

  const domain = registrableDomain(url.toString());
  const llm = ctx.llm ?? analyzeWithLlm;
  const [reputation, ageDays, llmOutcome] = await Promise.all([
    lookupReputation(db, url.hostname, domain),
    domainAgeDays(db, domain),
    wantAi && chain.length > 0
      ? llm(chain, { url: page.url, title: page.title, text: page.text, lang: page.lang }).then(
          (r): LlmResult | Error => r,
          (e: unknown): LlmResult | Error => (e instanceof Error ? e : new Error(String(e))),
        )
      : Promise.resolve(null),
  ]);

  const llmResult = llmOutcome instanceof Error ? null : llmOutcome;
  if (llmOutcome instanceof Error) console.warn('LLM no disponible:', llmOutcome.message);

  const factChecks: FactCheckMatch[] = llmResult
    ? await searchFactChecks(env.FACTCHECK_API_KEY, llmResult.analysis.claims, page.lang)
    : [];

  const trust = computeTrustScore([
    ...sourceSignals({
      url: url.toString(),
      reputation,
      domainAgeDays: ageDays,
      hasAboutPage: page.hasAboutPage,
      hasContactPage: page.hasContactPage,
    }),
    ...contentSignals(page),
    ...aiSignals(llmResult?.analysis ?? null, factChecks),
  ]);

  const row: AnalysisRow = {
    id: crypto.randomUUID(),
    urlHash,
    url: normalized,
    domain,
    title: page.title.slice(0, 500),
    contentHash,
    score: trust.score,
    level: trust.level,
    trustJson: JSON.stringify(trust),
    aiJson: llmResult ? JSON.stringify(llmResult.analysis) : null,
    factChecksJson: JSON.stringify(factChecks),
    llmProvider: llmResult?.provider ?? null,
    llmModel: llmResult?.model ?? null,
    createdAt: new Date(),
  };
  await db.insert(analysis).values(row);

  // Solo consume cuota de IA del servidor si no se usó la clave propia del usuario.
  const usedServerAi =
    !!llmResult &&
    !(byok && llmResult.provider === byok.provider && llmResult.model === byok.model);
  await Promise.all([recordUsage(db, subject.key, usedServerAi), touchHistory(db, user, row.id)]);

  const reason = !wantAi
    ? undefined
    : llmOutcome instanceof Error
      ? 'El servicio de IA no está disponible ahora mismo.'
      : !llmResult
        ? unavailableReason(serverAiAllowed)
        : undefined;
  return rowToResponse(row, false, reason);
}

function unavailableReason(serverAiAllowed: boolean) {
  return serverAiAllowed
    ? 'No hay ningún proveedor de IA configurado.'
    : 'Has agotado los análisis con IA de hoy. Inicia sesión o añade tu propia clave para obtener más.';
}

async function touchHistory(db: Db, user: AuthUser | null, analysisId: string) {
  if (!user) return;
  await db
    .insert(userHistory)
    .values({ id: crypto.randomUUID(), userId: user.id, analysisId, viewedAt: new Date() })
    .onConflictDoUpdate({
      target: [userHistory.userId, userHistory.analysisId],
      set: { viewedAt: new Date() },
    });
}

export function rowToResponse(
  row: AnalysisRow,
  cached: boolean,
  aiUnavailableReason?: string,
): AnalyzeResponse {
  return {
    id: row.id,
    url: row.url,
    domain: row.domain,
    title: row.title,
    analyzedAt: row.createdAt.toISOString(),
    cached,
    trust: JSON.parse(row.trustJson) as TrustScore,
    ai: row.aiJson
      ? { ...JSON.parse(row.aiJson), provider: row.llmProvider ?? '?', model: row.llmModel ?? '?' }
      : null,
    ...(aiUnavailableReason ? { aiUnavailableReason } : {}),
    factChecks: JSON.parse(row.factChecksJson) as FactCheckMatch[],
  };
}
