import { AnalyzeRequestSchema, type HistoryItem } from '@confinet/core';
import { PROVIDERS } from '@confinet/llm';
import { and, desc, eq, lt } from 'drizzle-orm';
import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { getDb } from '../db';
import { analysis, apiToken, feedback, userHistory } from '../db/schema';
import type { AppEnv } from '../env';
import { randomToken, sha256Hex } from '../lib/crypto';
import { HttpError } from '../lib/errors';
import { rowToResponse, runAnalysis } from '../services/analyze';
import { deleteUserLlmConfig, describeUserLlmConfig, saveUserLlmConfig } from '../services/byok';
import { getUsage, quotaSubject } from '../services/quota';

export const v1 = new Hono<AppEnv>();

const clientIp = (c: Context<AppEnv>) => c.req.header('cf-connecting-ip') ?? '127.0.0.1';

function requireUser(c: Context<AppEnv>) {
  const user = c.get('user');
  if (!user) throw new HttpError(401, 'unauthorized', 'Inicia sesión para continuar');
  return user;
}

async function parseBody<T extends z.ZodType>(c: Context<AppEnv>, schema: T): Promise<z.infer<T>> {
  const body = await c.req.json().catch(() => {
    throw new HttpError(400, 'invalid_json', 'El cuerpo no es JSON válido');
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new HttpError(
      422,
      'invalid_body',
      parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    );
  }
  return parsed.data;
}

// ── Análisis ─────────────────────────────────────────────────────────────────
v1.post('/analyze', async (c) => {
  const req = await parseBody(c, AnalyzeRequestSchema);
  const result = await runAnalysis(
    { env: c.env, db: getDb(c.env.DB), user: c.get('user'), ip: clientIp(c) },
    req,
  );
  return c.json(result);
});

v1.get('/analyses/:id', async (c) => {
  const row = await getDb(c.env.DB)
    .select()
    .from(analysis)
    .where(eq(analysis.id, c.req.param('id')))
    .get();
  if (!row) throw new HttpError(404, 'not_found', 'Análisis no encontrado');
  return c.json(rowToResponse(row, true));
});

// ── Cuenta ───────────────────────────────────────────────────────────────────
v1.get('/me', async (c) => {
  const user = c.get('user');
  const db = getDb(c.env.DB);
  const subject = await quotaSubject(c.env, user, clientIp(c));
  return c.json({
    user,
    usage: await getUsage(db, subject.key),
    limits: subject.limits,
    llm: user ? await describeUserLlmConfig(db, user.id) : null,
  });
});

/** Qué métodos de inicio de sesión hay activos (la PWA solo muestra esos botones). */
v1.get('/config', (c) =>
  c.json({
    devLogin: c.env.ENABLE_DEV_LOGIN === 'true',
    oauth: {
      google: !!(c.env.GOOGLE_CLIENT_ID && c.env.GOOGLE_CLIENT_SECRET),
      github: !!(c.env.GITHUB_CLIENT_ID && c.env.GITHUB_CLIENT_SECRET),
    },
  }),
);

v1.get('/providers', (c) =>
  c.json(
    // Sin modelo sugerido: el usuario elige siempre proveedor y modelo.
    PROVIDERS.filter((p) => p !== 'mock').map((id) => ({ id })),
  ),
);

// ── Historial ────────────────────────────────────────────────────────────────
v1.get('/history', async (c) => {
  const user = requireUser(c);
  const before = c.req.query('before');
  const limit = Math.min(Number(c.req.query('limit') ?? 30), 100);
  const rows = await getDb(c.env.DB)
    .select({
      id: userHistory.id,
      analysisId: analysis.id,
      url: analysis.url,
      domain: analysis.domain,
      title: analysis.title,
      score: analysis.score,
      level: analysis.level,
      viewedAt: userHistory.viewedAt,
    })
    .from(userHistory)
    .innerJoin(analysis, eq(userHistory.analysisId, analysis.id))
    .where(
      and(
        eq(userHistory.userId, user.id),
        before ? lt(userHistory.viewedAt, new Date(before)) : undefined,
      ),
    )
    .orderBy(desc(userHistory.viewedAt))
    .limit(limit)
    .all();
  const items: HistoryItem[] = rows.map((r) => ({
    ...r,
    level: r.level as HistoryItem['level'],
    viewedAt: r.viewedAt.toISOString(),
  }));
  return c.json({ items, nextBefore: items.length === limit ? items.at(-1)?.viewedAt : null });
});

v1.delete('/history/:id', async (c) => {
  const user = requireUser(c);
  await getDb(c.env.DB)
    .delete(userHistory)
    .where(and(eq(userHistory.id, c.req.param('id')), eq(userHistory.userId, user.id)));
  return c.body(null, 204);
});

v1.delete('/history', async (c) => {
  const user = requireUser(c);
  await getDb(c.env.DB).delete(userHistory).where(eq(userHistory.userId, user.id));
  return c.body(null, 204);
});

// ── Feedback ─────────────────────────────────────────────────────────────────
const FeedbackSchema = z.object({
  analysisId: z.string().uuid(),
  kind: z.enum(['too_high', 'too_low', 'wrong_signal', 'other']),
  comment: z.string().max(1000).optional(),
});

v1.post('/feedback', async (c) => {
  const body = await parseBody(c, FeedbackSchema);
  await getDb(c.env.DB)
    .insert(feedback)
    .values({ id: crypto.randomUUID(), ...body, userId: c.get('user')?.id ?? null });
  return c.json({ ok: true }, 201);
});

// ── BYOK: proveedor LLM propio ───────────────────────────────────────────────
const ByokSchema = z.object({
  provider: z.string(),
  model: z.string().min(1).max(200),
  apiKey: z.string().max(500).optional(),
  baseUrl: z.string().url().max(500).optional(),
});

v1.get('/settings/llm', async (c) => {
  const user = requireUser(c);
  return c.json(await describeUserLlmConfig(getDb(c.env.DB), user.id));
});

v1.put('/settings/llm', async (c) => {
  const user = requireUser(c);
  const body = await parseBody(c, ByokSchema);
  const db = getDb(c.env.DB);
  await saveUserLlmConfig(db, c.env, user.id, body);
  return c.json(await describeUserLlmConfig(db, user.id));
});

v1.delete('/settings/llm', async (c) => {
  const user = requireUser(c);
  await deleteUserLlmConfig(getDb(c.env.DB), user.id);
  return c.body(null, 204);
});

// ── Tokens para la extensión ─────────────────────────────────────────────────
v1.post('/extension/token', async (c) => {
  const user = requireUser(c);
  // Solo desde una sesión de la PWA (cookie): un token no puede generar más tokens.
  if (c.req.header('authorization'))
    throw new HttpError(403, 'forbidden', 'Usa la sesión de la web');
  const { label } = await parseBody(
    c,
    z.object({ label: z.string().max(100).default('Extensión') }),
  );
  const token = randomToken('cnf');
  const id = crypto.randomUUID();
  await getDb(c.env.DB)
    .insert(apiToken)
    .values({ id, userId: user.id, tokenHash: await sha256Hex(token), label });
  return c.json({ id, token }, 201);
});

v1.get('/extension/tokens', async (c) => {
  const user = requireUser(c);
  const rows = await getDb(c.env.DB)
    .select({
      id: apiToken.id,
      label: apiToken.label,
      createdAt: apiToken.createdAt,
      lastUsedAt: apiToken.lastUsedAt,
    })
    .from(apiToken)
    .where(eq(apiToken.userId, user.id))
    .all();
  return c.json(rows);
});

v1.delete('/extension/tokens/:id', async (c) => {
  const user = requireUser(c);
  await getDb(c.env.DB)
    .delete(apiToken)
    .where(and(eq(apiToken.id, c.req.param('id')), eq(apiToken.userId, user.id)));
  return c.body(null, 204);
});
