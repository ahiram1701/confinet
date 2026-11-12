import { detectLocale, isLocale, type Locale } from '@confinet/i18n';
import type { LocalePreference, PreferenceStore } from '@confinet/i18n/react';
import { browser } from 'wxt/browser';

/** Preferencia de idioma de la extensión, en storage.local (la comparten popup, opciones y background). */
export const extensionPreference: PreferenceStore = {
  async load() {
    const { locale } = await browser.storage.local.get('locale');
    return isLocale(locale) ? locale : 'auto';
  },
  async save(pref: LocalePreference) {
    if (pref === 'auto') await browser.storage.local.remove('locale');
    else await browser.storage.local.set({ locale: pref });
  },
};

/** Idioma efectivo (para el background, que no usa React). */
export async function getLocale(): Promise<Locale> {
  const pref = await extensionPreference.load();
  return pref === 'auto' ? detectLocale() : pref;
}
