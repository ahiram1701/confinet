import { LOCALE_NAMES, LOCALES } from '@confinet/i18n';
import { useI18n, type LocalePreference } from '@confinet/i18n/react';

/** Selector de idioma de «Cuenta» (en las dos versiones: con y sin servidor). */
export function LanguageCard() {
  const { t, preference, setPreference } = useI18n();
  return (
    <section className="cf-card cf-stack" aria-labelledby="language-title">
      <h2 className="cf-h2" id="language-title">
        {t('language.title')}
      </h2>
      <select
        className="input"
        aria-labelledby="language-title"
        value={preference}
        onChange={(e) => setPreference(e.target.value as LocalePreference)}
      >
        <option value="auto">{t('language.auto')}</option>
        {LOCALES.map((l) => (
          <option key={l} value={l} lang={l}>
            {LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
      <span className="cf-muted cf-small">{t('language.help')}</span>
    </section>
  );
}
