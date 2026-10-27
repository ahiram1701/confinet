import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

const timestamp = (name: string) => integer(name, { mode: 'timestamp_ms' });
const now = sql`(unixepoch() * 1000)`;

// ── Tablas de Better Auth ──────────────────────────────────────────────────────
export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().default(now),
  updatedAt: timestamp('updated_at').notNull().default(now),
});

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().default(now),
  updatedAt: timestamp('updated_at').notNull().default(now),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().default(now),
  updatedAt: timestamp('updated_at').notNull().default(now),
});

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().default(now),
  updatedAt: timestamp('updated_at').notNull().default(now),
});

// ── Tokens de la extensión (Bearer, guardados como hash) ────────────────────────
export const apiToken = sqliteTable('api_token', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  label: text('label').notNull(),
  createdAt: timestamp('created_at').notNull().default(now),
  lastUsedAt: timestamp('last_used_at'),
});

// ── Dominio ─────────────────────────────────────────────────────────────────────
export const analysis = sqliteTable(
  'analysis',
  {
    id: text('id').primaryKey(),
    urlHash: text('url_hash').notNull(),
    url: text('url').notNull(),
    domain: text('domain').notNull(),
    title: text('title').notNull(),
    contentHash: text('content_hash').notNull(),
    score: integer('score'),
    level: text('level').notNull(),
    /** TrustScore completo serializado (señales + explicaciones). */
    trustJson: text('trust_json').notNull(),
    aiJson: text('ai_json'),
    factChecksJson: text('fact_checks_json').notNull().default('[]'),
    llmProvider: text('llm_provider'),
    llmModel: text('llm_model'),
    createdAt: timestamp('created_at').notNull().default(now),
  },
  (t) => [
    index('analysis_url_hash_idx').on(t.urlHash, t.createdAt),
    index('analysis_domain_idx').on(t.domain),
  ],
);

export const userHistory = sqliteTable(
  'user_history',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    analysisId: text('analysis_id')
      .notNull()
      .references(() => analysis.id, { onDelete: 'cascade' }),
    viewedAt: timestamp('viewed_at').notNull().default(now),
  },
  (t) => [
    uniqueIndex('user_history_user_analysis_idx').on(t.userId, t.analysisId),
    index('user_history_user_viewed_idx').on(t.userId, t.viewedAt),
  ],
);

export const domainReputation = sqliteTable('domain_reputation', {
  domain: text('domain').primaryKey(),
  rating: text('rating', {
    enum: ['reliable', 'mixed', 'unreliable', 'satire', 'unknown'],
  }).notNull(),
  source: text('source').notNull(),
  notes: text('notes'),
  updatedAt: timestamp('updated_at').notNull().default(now),
  updatedBy: text('updated_by'),
});

/** Caché de RDAP (antigüedad del dominio). */
export const domainInfo = sqliteTable('domain_info', {
  domain: text('domain').primaryKey(),
  registeredAt: timestamp('registered_at'),
  checkedAt: timestamp('checked_at').notNull().default(now),
});

export const feedback = sqliteTable('feedback', {
  id: text('id').primaryKey(),
  analysisId: text('analysis_id')
    .notNull()
    .references(() => analysis.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
  kind: text('kind', { enum: ['too_high', 'too_low', 'wrong_signal', 'other'] }).notNull(),
  comment: text('comment'),
  status: text('status', { enum: ['open', 'resolved'] })
    .notNull()
    .default('open'),
  createdAt: timestamp('created_at').notNull().default(now),
});

/** Contadores diarios para las cuotas (protegen el plan gratuito). */
export const usageCounter = sqliteTable(
  'usage_counter',
  {
    subject: text('subject').notNull(),
    day: text('day').notNull(),
    analyses: integer('analyses').notNull().default(0),
    aiAnalyses: integer('ai_analyses').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.subject, t.day] })],
);

/** BYOK: clave LLM propia del usuario, cifrada con AES-GCM. */
export const userLlmKey = sqliteTable('user_llm_key', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  baseUrl: text('base_url'),
  keyCiphertext: text('key_ciphertext'),
  keyIv: text('key_iv'),
  updatedAt: timestamp('updated_at').notNull().default(now),
});
