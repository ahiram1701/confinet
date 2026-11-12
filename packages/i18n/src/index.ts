import { en } from './en';
import { es, type Message, type MessageKey } from './es';

export type { Message, MessageKey } from './es';

export const LOCALES = ['es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export type Params = Record<string, string | number>;

/** Un texto traducible guardado como datos: clave + parámetros (p. ej. en las señales). */
export interface MessageRef {
  key: MessageKey;
  params?: Params;
}

const DICTIONARIES: Record<Locale, Record<MessageKey, Message>> = { es, en };

export const LOCALE_NAMES: Record<Locale, string> = { es: 'Español', en: 'English' };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * El primer idioma disponible en el orden de preferencia del navegador (es-MX → es); si no
 * prefiere ninguno de los nuestros, inglés.
 */
export function detectLocale(
  languages: readonly string[] = typeof navigator === 'undefined' ? [] : navigator.languages,
): Locale {
  for (const lang of languages) {
    const base = lang.toLowerCase().split('-')[0];
    if (isLocale(base)) return base;
  }
  return 'en';
}

const pluralRules = new Map<Locale, Intl.PluralRules>();

/**
 * Traduce una clave. Los parámetros se interpolan como {nombre}; si el texto tiene formas
 * { one, other }, se elige con el parámetro `n`. Si falta la clave en un idioma, usa el español.
 */
export function translate(locale: Locale, key: MessageKey, params?: Params): string {
  const message = DICTIONARIES[locale][key] ?? es[key];
  let text: string;
  if (typeof message === 'string') {
    text = message;
  } else {
    let rules = pluralRules.get(locale);
    if (!rules) pluralRules.set(locale, (rules = new Intl.PluralRules(locale)));
    text = rules.select(Number(params?.n ?? 0)) === 'one' ? message.one : message.other;
  }
  return params ? text.replace(/\{(\w+)\}/g, (m, name: string) => String(params[name] ?? m)) : text;
}

export function translateRef(locale: Locale, ref: MessageRef): string {
  return translate(locale, ref.key, ref.params);
}

export function hasKey(key: string): key is MessageKey {
  return Object.hasOwn(es, key);
}

/**
 * Error con texto traducible. La UI lo muestra con `t(error)`; `message` lleva el texto en
 * español para los registros y para quien no traduzca.
 */
export class AppError extends Error {
  constructor(
    public readonly key: MessageKey,
    public readonly params?: Params,
    options?: ErrorOptions,
  ) {
    super(translate('es', key, params), options);
    this.name = 'AppError';
  }
}

/**
 * Texto de un error cualquiera en el idioma pedido:
 *  - AppError, o un error con `ref` ({ key, params }): se traduce;
 *  - error de la API con `code` conocido: en español se deja el texto exacto del servidor y en
 *    otros idiomas se usa el genérico de `apiError.<code>`;
 *  - cualquier otro: su `message`.
 */
export function errorText(locale: Locale, error: unknown): string {
  if (error instanceof AppError) return translate(locale, error.key, error.params);
  const e = (error ?? {}) as { ref?: MessageRef; code?: unknown };
  if (e.ref) return translateRef(locale, e.ref);
  const apiKey = `apiError.${String(e.code)}`;
  if (locale !== 'es' && hasKey(apiKey)) return translate(locale, apiKey);
  return error instanceof Error ? error.message : String(error);
}

export function formatDate(
  locale: Locale,
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
): string {
  return new Date(date).toLocaleString(locale, options);
}

export function formatNumber(locale: Locale, n: number, options?: Intl.NumberFormatOptions) {
  return n.toLocaleString(locale, options);
}
