import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { eq } from 'drizzle-orm';
import type { MiddlewareHandler } from 'hono';
import { getDb, type Db } from './db';
import { apiToken, user as userTable, account, session, verification } from './db/schema';
import type { AppEnv, AuthUser, Env } from './env';
import { sha256Hex } from './lib/crypto';

/**
 * Better Auth se crea por petición porque en Workers las variables de entorno (bindings)
 * solo existen dentro del handler.
 *
 * La API se sirve bajo el MISMO origen que la PWA (Pages reenvía /api/* al Worker), así que
 * las cookies de sesión son de primera parte: no dependen de cookies de terceros.
 */
export function createAuth(env: Env, db: Db = getDb(env.DB)) {
  const devLogin = env.ENABLE_DEV_LOGIN === 'true';
  return betterAuth({
    appName: 'Confinet',
    baseURL: env.APP_URL,
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.APP_URL],
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: { user: userTable, account, session, verification },
    }),
    // Sin proveedor de correo (coste 0): solo OAuth. Email+contraseña únicamente en local/CI.
    emailAndPassword: { enabled: devLogin, requireEmailVerification: false },
    socialProviders: {
      ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
        : {}),
      ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
        ? { github: { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET } }
        : {}),
    },
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
  });
}

/**
 * Resuelve el usuario de la petición:
 *  1. `Authorization: Bearer cnf_…` → token de la extensión (guardado como hash).
 *  2. Cookie de sesión de Better Auth → PWA.
 */
export const resolveUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  const db = getDb(c.env.DB);
  const admins = (c.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const toAuthUser = (u: { id: string; email: string; name: string }): AuthUser => ({
    id: u.id,
    email: u.email,
    name: u.name,
    isAdmin: admins.includes(u.email.toLowerCase()),
  });

  let found: AuthUser | null = null;
  const header = c.req.header('authorization');
  if (header?.startsWith('Bearer cnf_')) {
    const hash = await sha256Hex(header.slice('Bearer '.length));
    const row = await db
      .select({
        tokenId: apiToken.id,
        id: userTable.id,
        email: userTable.email,
        name: userTable.name,
      })
      .from(apiToken)
      .innerJoin(userTable, eq(apiToken.userId, userTable.id))
      .where(eq(apiToken.tokenHash, hash))
      .get();
    if (row) {
      found = toAuthUser(row);
      c.executionCtx.waitUntil(
        db
          .update(apiToken)
          .set({ lastUsedAt: new Date() })
          .where(eq(apiToken.id, row.tokenId))
          .run(),
      );
    }
  } else {
    const result = await createAuth(c.env, db).api.getSession({ headers: c.req.raw.headers });
    if (result?.user) found = toAuthUser(result.user);
  }

  c.set('user', found);
  await next();
};
