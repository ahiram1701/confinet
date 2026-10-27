export interface Env {
  DB: D1Database;

  APP_URL: string;
  BETTER_AUTH_SECRET: string;
  /** Clave AES-256 en base64 para cifrar las claves BYOK de los usuarios. */
  ENCRYPTION_KEY: string;

  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  /** Solo local/CI: permite email+contraseña para no depender de OAuth. */
  ENABLE_DEV_LOGIN?: string;
  ADMIN_EMAILS?: string;

  FACTCHECK_API_KEY?: string;

  AI_DAILY_ANON: string;
  AI_DAILY_USER: string;
  ANALYZE_DAILY_ANON: string;
  ANALYZE_DAILY_USER: string;
  CACHE_TTL_HOURS: string;

  // Configuración LLM (ver @confinet/llm chainFromEnv). Se lee como mapa genérico.
  [key: string]: unknown;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
}

export type AppEnv = {
  Bindings: Env;
  Variables: {
    user: AuthUser | null;
  };
};
