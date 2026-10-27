import { desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { getDb } from '../db';
import { analysis, domainReputation, feedback } from '../db/schema';
import type { AppEnv } from '../env';
import { HttpError } from '../lib/errors';

export const admin = new Hono<AppEnv>();

admin.use(async (c, next) => {
  if (!c.get('user')?.isAdmin) throw new HttpError(403, 'forbidden', 'Solo administradores');
  await next();
});

admin.get('/feedback', async (c) => {
  const status = c.req.query('status') === 'resolved' ? 'resolved' : 'open';
  const rows = await getDb(c.env.DB)
    .select({
      id: feedback.id,
      kind: feedback.kind,
      comment: feedback.comment,
      status: feedback.status,
      createdAt: feedback.createdAt,
      analysisId: analysis.id,
      url: analysis.url,
      domain: analysis.domain,
      title: analysis.title,
      score: analysis.score,
    })
    .from(feedback)
    .innerJoin(analysis, eq(feedback.analysisId, analysis.id))
    .where(eq(feedback.status, status))
    .orderBy(desc(feedback.createdAt))
    .limit(200)
    .all();
  return c.json(rows);
});

admin.patch('/feedback/:id', async (c) => {
  const { status } = z.object({ status: z.enum(['open', 'resolved']) }).parse(await c.req.json());
  await getDb(c.env.DB)
    .update(feedback)
    .set({ status })
    .where(eq(feedback.id, c.req.param('id')));
  return c.json({ ok: true });
});

admin.get('/reputation', async (c) => {
  const rows = await getDb(c.env.DB)
    .select()
    .from(domainReputation)
    .orderBy(domainReputation.domain)
    .all();
  return c.json(rows);
});

const ReputationSchema = z.object({
  rating: z.enum(['reliable', 'mixed', 'unreliable', 'satire', 'unknown']),
  source: z.string().min(1).max(200),
  notes: z.string().max(1000).optional(),
});

admin.put('/reputation/:domain', async (c) => {
  const domain = c.req.param('domain').toLowerCase();
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain))
    throw new HttpError(422, 'invalid_domain', 'Dominio no válido');
  const body = ReputationSchema.parse(await c.req.json());
  const values = {
    ...body,
    notes: body.notes ?? null,
    updatedAt: new Date(),
    updatedBy: c.get('user')!.email,
  };
  await getDb(c.env.DB)
    .insert(domainReputation)
    .values({ domain, ...values })
    .onConflictDoUpdate({ target: domainReputation.domain, set: values });
  return c.json({ domain, ...values });
});

admin.delete('/reputation/:domain', async (c) => {
  await getDb(c.env.DB)
    .delete(domainReputation)
    .where(eq(domainReputation.domain, c.req.param('domain')));
  return c.body(null, 204);
});
