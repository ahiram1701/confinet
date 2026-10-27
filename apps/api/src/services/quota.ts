import { and, eq, sql } from 'drizzle-orm';
import type { Db } from '../db';
import { usageCounter } from '../db/schema';
import type { AuthUser, Env } from '../env';
import { sha256Hex } from '../lib/crypto';

export interface QuotaSubject {
  key: string;
  limits: { analyses: number; ai: number };
}

/** Identifica a quién se cobra la cuota: el usuario o (anónimo) un hash de su IP. */
export async function quotaSubject(
  env: Env,
  user: AuthUser | null,
  ip: string,
): Promise<QuotaSubject> {
  if (user) {
    return {
      key: `user:${user.id}`,
      limits: { analyses: Number(env.ANALYZE_DAILY_USER), ai: Number(env.AI_DAILY_USER) },
    };
  }
  // No guardamos IPs en claro.
  const ipHash = (await sha256Hex(`${env.BETTER_AUTH_SECRET}:${ip}`)).slice(0, 32);
  return {
    key: `ip:${ipHash}`,
    limits: { analyses: Number(env.ANALYZE_DAILY_ANON), ai: Number(env.AI_DAILY_ANON) },
  };
}

const today = () => new Date().toISOString().slice(0, 10);

export async function getUsage(db: Db, subject: string) {
  const row = await db
    .select()
    .from(usageCounter)
    .where(and(eq(usageCounter.subject, subject), eq(usageCounter.day, today())))
    .get();
  return { analyses: row?.analyses ?? 0, ai: row?.aiAnalyses ?? 0 };
}

/** Incrementa los contadores de forma atómica (UPSERT). */
export async function recordUsage(db: Db, subject: string, usedAi: boolean) {
  const ai = usedAi ? 1 : 0;
  await db
    .insert(usageCounter)
    .values({ subject, day: today(), analyses: 1, aiAnalyses: ai })
    .onConflictDoUpdate({
      target: [usageCounter.subject, usageCounter.day],
      set: {
        analyses: sql`${usageCounter.analyses} + 1`,
        aiAnalyses: sql`${usageCounter.aiAnalyses} + ${ai}`,
      },
    });
}
