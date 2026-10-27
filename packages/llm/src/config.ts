export const PROVIDERS = [
  'anthropic',
  'openai',
  'google',
  'mistral',
  'groq',
  'openrouter',
  'workers-ai',
  'ollama',
  'ollama-cloud',
  'openai-compatible',
  'mock',
] as const;

export type ProviderId = (typeof PROVIDERS)[number];

export interface LlmConfig {
  provider: ProviderId;
  model: string;
  apiKey?: string;
  /** Obligatorio para `openai-compatible`; opcional para el resto (proxies, Ollama remoto...). */
  baseUrl?: string;
  timeoutMs?: number;
}

/** Variable de entorno con la API key de cada proveedor en la cadena de respaldo. */
const KEY_ENV: Partial<Record<ProviderId, string[]>> = {
  anthropic: ['ANTHROPIC_API_KEY'],
  openai: ['OPENAI_API_KEY'],
  google: ['GOOGLE_GENERATIVE_AI_API_KEY', 'GEMINI_API_KEY'],
  mistral: ['MISTRAL_API_KEY'],
  groq: ['GROQ_API_KEY'],
  openrouter: ['OPENROUTER_API_KEY'],
  'workers-ai': ['CLOUDFLARE_AI_TOKEN'],
  'ollama-cloud': ['OLLAMA_API_KEY'],
};

export function isProviderId(value: string): value is ProviderId {
  return (PROVIDERS as readonly string[]).includes(value);
}

type Env = Record<string, string | undefined>;

/**
 * Construye la cadena de proveedores desde variables de entorno. No hay proveedor ni modelo
 * por defecto: sin LLM_PROVIDER no se usa IA, y cada proveedor exige su modelo explícito.
 *
 *   LLM_PROVIDER=google  LLM_MODEL=gemini-2.5-flash  LLM_API_KEY=...  LLM_BASE_URL=...
 *   LLM_FALLBACKS=groq:llama-3.3-70b-versatile,ollama-cloud:gpt-oss:120b
 *
 * Las claves de los respaldos se leen de su variable propia (GROQ_API_KEY, ...).
 */
export function chainFromEnv(env: Env): LlmConfig[] {
  const chain: LlmConfig[] = [];
  const timeoutMs = env.LLM_TIMEOUT_MS ? Number(env.LLM_TIMEOUT_MS) : undefined;

  const primary = env.LLM_PROVIDER?.trim();
  if (primary) {
    if (!isProviderId(primary)) throw new Error(`LLM_PROVIDER desconocido: ${primary}`);
    chain.push({
      provider: primary,
      model: requireModel(primary, env.LLM_MODEL),
      apiKey: env.LLM_API_KEY || keyFromEnv(primary, env),
      baseUrl: env.LLM_BASE_URL || baseUrlFromEnv(primary, env),
      timeoutMs,
    });
  }

  for (const entry of (env.LLM_FALLBACKS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)) {
    const [provider, ...modelParts] = entry.split(':');
    if (!provider || !isProviderId(provider))
      throw new Error(`Proveedor de respaldo desconocido: ${entry}`);
    chain.push({
      provider,
      model: requireModel(provider, modelParts.join(':'), entry),
      apiKey: keyFromEnv(provider, env),
      baseUrl: baseUrlFromEnv(provider, env),
      timeoutMs,
    });
  }

  return chain;
}

/** El modelo siempre lo elige quien configura (salvo el proveedor de pruebas `mock`). */
function requireModel(provider: ProviderId, model: string | undefined, entry?: string): string {
  const value = model?.trim();
  if (value) return value;
  if (provider === 'mock') return 'mock';
  throw new Error(
    entry
      ? `Falta el modelo en LLM_FALLBACKS: usa "${provider}:<modelo>" (recibido "${entry}")`
      : `Falta LLM_MODEL para el proveedor "${provider}"`,
  );
}

function keyFromEnv(provider: ProviderId, env: Env): string | undefined {
  return KEY_ENV[provider]?.map((name) => env[name]).find(Boolean);
}

function baseUrlFromEnv(provider: ProviderId, env: Env): string | undefined {
  if (provider === 'workers-ai' && env.CLOUDFLARE_ACCOUNT_ID) {
    return `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/v1`;
  }
  if (provider === 'ollama') return env.OLLAMA_BASE_URL;
  return undefined;
}
