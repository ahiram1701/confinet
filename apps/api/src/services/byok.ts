import { isProviderId, type LlmConfig } from '@confinet/llm';
import { eq } from 'drizzle-orm';
import type { Db } from '../db';
import { userLlmKey } from '../db/schema';
import type { Env } from '../env';
import { decryptSecret, encryptSecret } from '../lib/crypto';
import { HttpError } from '../lib/errors';
import { assertPublicUrl } from './fetch-page';

/** Configuración LLM propia del usuario (BYOK), con la clave descifrada. */
export async function getUserLlmConfig(
  db: Db,
  env: Env,
  userId: string,
): Promise<LlmConfig | null> {
  const row = await db.select().from(userLlmKey).where(eq(userLlmKey.userId, userId)).get();
  if (!row || !isProviderId(row.provider)) return null;
  const apiKey =
    row.keyCiphertext && row.keyIv
      ? await decryptSecret(row.keyCiphertext, row.keyIv, env.ENCRYPTION_KEY)
      : undefined;
  return { provider: row.provider, model: row.model, apiKey, baseUrl: row.baseUrl ?? undefined };
}

export interface ByokInput {
  provider: string;
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

export async function saveUserLlmConfig(db: Db, env: Env, userId: string, input: ByokInput) {
  if (!isProviderId(input.provider) || input.provider === 'mock') {
    throw new HttpError(422, 'invalid_provider', 'Proveedor no soportado');
  }
  // Una URL base propia hace que el servidor llame a ese host: aplicamos la misma protección SSRF.
  // (Ollama local no es accesible desde la nube: el usuario debe exponerlo con una URL pública.)
  if (input.baseUrl) assertPublicUrl(input.baseUrl);

  const secret = input.apiKey ? await encryptSecret(input.apiKey, env.ENCRYPTION_KEY) : null;
  const values = {
    userId,
    provider: input.provider,
    model: input.model,
    baseUrl: input.baseUrl ?? null,
    keyCiphertext: secret?.ciphertext ?? null,
    keyIv: secret?.iv ?? null,
    updatedAt: new Date(),
  };
  await db
    .insert(userLlmKey)
    .values(values)
    .onConflictDoUpdate({ target: userLlmKey.userId, set: values });
}

export async function deleteUserLlmConfig(db: Db, userId: string) {
  await db.delete(userLlmKey).where(eq(userLlmKey.userId, userId));
}

/** Versión pública (sin la clave) para mostrar en la cuenta. */
export async function describeUserLlmConfig(db: Db, userId: string) {
  const row = await db.select().from(userLlmKey).where(eq(userLlmKey.userId, userId)).get();
  return row
    ? {
        provider: row.provider,
        model: row.model,
        baseUrl: row.baseUrl,
        hasKey: !!row.keyCiphertext,
      }
    : null;
}
