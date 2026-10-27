import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { ZodError } from 'zod';
import { createAuth, resolveUser } from './auth';
import type { AppEnv } from './env';
import { HttpError } from './lib/errors';
import { admin } from './routes/admin';
import { v1 } from './routes/v1';

// Todas las rutas cuelgan de /api: en producción Pages reenvía /api/* a este Worker
// y en desarrollo lo hace el proxy de Vite. La PWA y la API comparten origen.
const app = new Hono<AppEnv>().basePath('/api');

app.use(secureHeaders());

// La extensión llama desde chrome-extension://… con un token Bearer (sin cookies).
app.use(
  '/v1/*',
  cors({
    origin: (origin) => (origin.startsWith('chrome-extension://') ? origin : null),
    allowHeaders: ['authorization', 'content-type'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    maxAge: 86400,
  }),
);

app.get('/health', (c) => c.json({ ok: true }));

app.on(['GET', 'POST'], '/auth/*', (c) => createAuth(c.env).handler(c.req.raw));

app.use('/v1/*', resolveUser);
app.route('/v1/admin', admin);
app.route('/v1', v1);

app.notFound((c) => c.json({ error: 'Ruta no encontrada', code: 'not_found' }, 404));

app.onError((err, c) => {
  if (err instanceof HttpError) return c.json({ error: err.message, code: err.code }, err.status);
  if (err instanceof ZodError)
    return c.json({ error: 'Datos no válidos', code: 'invalid_body' }, 422);
  console.error(err);
  return c.json({ error: 'Error interno', code: 'internal' }, 500);
});

export default app;
