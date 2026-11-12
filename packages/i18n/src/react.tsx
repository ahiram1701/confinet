import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  detectLocale,
  errorText,
  isLocale,
  translate,
  type Locale,
  type MessageKey,
  type MessageRef,
  type Params,
} from './index';

/** Preferencia de idioma guardada: un idioma concreto o «auto» (el del navegador). */
export type LocalePreference = Locale | 'auto';

/** Dónde se guarda la preferencia: localStorage en la web, storage.local en la extensión. */
export interface PreferenceStore {
  load(): LocalePreference | Promise<LocalePreference>;
  save(pref: LocalePreference): void | Promise<void>;
}

const STORAGE_KEY = 'confinet:locale';

export const localStoragePreference: PreferenceStore = {
  load() {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return isLocale(v) ? v : 'auto';
    } catch {
      return 'auto';
    }
  },
  save(pref) {
    try {
      if (pref === 'auto') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, pref);
    } catch {
      // Sin almacenamiento (modo privado): la preferencia dura lo que la pestaña.
    }
  },
};

export interface I18n {
  locale: Locale;
  preference: LocalePreference;
  setPreference(pref: LocalePreference): void;
  /** Traduce una clave, una referencia guardada ({ key, params }) o un AppError. */
  t: {
    (key: MessageKey, params?: Params): string;
    (ref: MessageRef): string;
  };
  /**
   * Texto con partes marcadas, p. ej. «Inicia <link>sesión</link> aquí»: cada etiqueta se
   * sustituye por lo que devuelva su función (un enlace, una negrita…).
   */
  rich(
    key: MessageKey,
    tags: Record<string, (chunk: string) => ReactNode>,
    params?: Params,
  ): ReactNode;
  /** Mensaje de un error cualquiera (ver `errorText` en index.ts). */
  errorText(error: unknown): string;
}

/** Sustituye <tag>texto</tag> por nodos de React. Lo que no está marcado se deja como texto. */
export function renderRich(
  text: string,
  tags: Record<string, (chunk: string) => ReactNode>,
): ReactNode {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(/<(\w+)>(.*?)<\/\1>/g)) {
    const render = tags[m[1]!];
    if (!render) continue;
    parts.push(text.slice(last, m.index), <Fragment key={m.index}>{render(m[2]!)}</Fragment>);
    last = m.index + m[0].length;
  }
  parts.push(text.slice(last));
  return parts;
}

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({
  children,
  store = localStoragePreference,
}: {
  children: ReactNode;
  store?: PreferenceStore;
}) {
  // La web lee la preferencia al instante (localStorage); la extensión, de forma asíncrona.
  const [preference, setPref] = useState<LocalePreference>(() => {
    const loaded = store.load();
    return loaded instanceof Promise ? 'auto' : loaded;
  });

  useEffect(() => {
    const loaded = store.load();
    if (loaded instanceof Promise) void loaded.then(setPref);
  }, [store]);

  const locale = preference === 'auto' ? detectLocale() : preference;

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setPreference = useCallback(
    (pref: LocalePreference) => {
      setPref(pref);
      void store.save(pref);
    },
    [store],
  );

  const value = useMemo<I18n>(() => {
    const t = ((keyOrRef: MessageKey | MessageRef, params?: Params) =>
      typeof keyOrRef === 'string'
        ? translate(locale, keyOrRef, params)
        : translate(locale, keyOrRef.key, keyOrRef.params)) as I18n['t'];
    return {
      locale,
      preference,
      setPreference,
      t,
      rich: (key, tags, params) => renderRich(translate(locale, key, params), tags),
      errorText: (error) => errorText(locale, error),
    };
  }, [locale, preference, setPreference]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n() necesita un <I18nProvider> por encima.');
  return ctx;
}
