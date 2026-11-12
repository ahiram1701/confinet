import '@confinet/ui/styles.css';
import { LOCALE_NAMES, LOCALES, type MessageKey } from '@confinet/i18n';
import { I18nProvider, useI18n, type LocalePreference } from '@confinet/i18n/react';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { APP_URL, BACKEND, getSettings, saveSettings, type Settings } from '../../lib/config';
import { extensionPreference } from '../../lib/locale';

const SITE_ORIGINS = ['https://*/*', 'http://*/*'];

function Options() {
  const { t, preference, setPreference } = useI18n();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [manualToken, setManualToken] = useState('');
  const [message, setMessage] = useState<MessageKey | null>(null);

  const reload = () => getSettings().then(setSettings);
  useEffect(() => {
    reload();
    // El token llega desde la PWA mientras esta página está abierta.
    const listener = () => reload();
    browser.storage.onChanged.addListener(listener);
    return () => browser.storage.onChanged.removeListener(listener);
  }, []);

  if (!settings) return null;

  const connect = () =>
    browser.tabs.create({
      url: `${APP_URL}/conectar-extension?ext=${encodeURIComponent(browser.runtime.id)}`,
    });

  const saveManual = async () => {
    if (!manualToken.trim().startsWith('cnf_')) return setMessage('ext.tokenPrefix');
    await saveSettings({ token: manualToken.trim() });
    setManualToken('');
    setMessage('ext.accountConnected');
  };

  const toggleAuto = async (enabled: boolean) => {
    if (enabled) {
      // Pedimos permiso sobre los sitios solo si el usuario activa el modo automático.
      const granted = await browser.permissions.request({ origins: SITE_ORIGINS });
      if (!granted) return setMessage('ext.noPermission');
    } else {
      await browser.permissions.remove({ origins: SITE_ORIGINS });
    }
    await saveSettings({ autoMode: enabled });
    setMessage(null);
  };

  return (
    <div className="cf-root cf-stack" style={{ maxWidth: 560, margin: '32px auto', padding: 16 }}>
      <h1 style={{ margin: 0 }}>{t('ext.optionsTitle')}</h1>

      {BACKEND === 'api' && (
        <section className="cf-card cf-stack">
          <h2 className="cf-h2">{t('ext.account')}</h2>
          {settings.token ? (
            <>
              <span>{t('ext.connected')}</span>
              <div className="cf-row">
                <a
                  className="cf-btn"
                  href={`${APP_URL}/historial`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: 'none' }}
                >
                  {t('ext.viewHistory')}
                </a>
                <button className="cf-btn" onClick={() => saveSettings({ token: null })}>
                  {t('ext.disconnect')}
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="cf-muted">{t('ext.noAccount')}</span>
              <button className="cf-btn cf-btn-primary" onClick={connect}>
                {t('ext.connectMyAccount')}
              </button>
              <details className="cf-details">
                <summary className="cf-small">{t('ext.manualToken')}</summary>
                <div className="cf-row" style={{ marginTop: 8 }}>
                  <input
                    style={{
                      flex: 1,
                      padding: 8,
                      borderRadius: 8,
                      border: '1px solid var(--cf-border)',
                      background: 'var(--cf-surface)',
                      color: 'var(--cf-text)',
                    }}
                    placeholder="cnf_…"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                  />
                  <button className="cf-btn" onClick={saveManual}>
                    {t('common.save')}
                  </button>
                </div>
              </details>
            </>
          )}
        </section>
      )}

      <section className="cf-card cf-stack">
        <h2 className="cf-h2">{t('ext.autoTitle')}</h2>
        <label className="cf-row" style={{ alignItems: 'flex-start' }}>
          <input
            type="checkbox"
            checked={settings.autoMode}
            onChange={(e) => toggleAuto(e.target.checked)}
          />
          <span>
            {t('ext.autoLabel')}
            <div className="cf-muted cf-small">{t('ext.autoHelp')}</div>
          </span>
        </label>
      </section>

      <section className="cf-card cf-stack">
        <h2 className="cf-h2" id="language-title">
          {t('language.title')}
        </h2>
        <select
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

      {message && <div className="cf-note">{t(message)}</div>}

      <p className="cf-muted cf-small">
        <a className="cf-link" href={`${APP_URL}/privacidad`} target="_blank" rel="noreferrer">
          {t('ext.privacy')}
        </a>
      </p>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider store={extensionPreference}>
      <Options />
    </I18nProvider>
  </StrictMode>,
);
