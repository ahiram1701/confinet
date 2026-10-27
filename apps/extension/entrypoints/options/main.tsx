import '@confinet/ui/styles.css';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { APP_URL, BACKEND, getSettings, saveSettings, type Settings } from '../../lib/config';

const SITE_ORIGINS = ['https://*/*', 'http://*/*'];

function Options() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [manualToken, setManualToken] = useState('');
  const [message, setMessage] = useState<string | null>(null);

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
    if (!manualToken.trim().startsWith('cnf_'))
      return setMessage('El código debe empezar por "cnf_".');
    await saveSettings({ token: manualToken.trim() });
    setManualToken('');
    setMessage('Cuenta conectada.');
  };

  const toggleAuto = async (enabled: boolean) => {
    if (enabled) {
      // Pedimos permiso sobre los sitios solo si el usuario activa el modo automático.
      const granted = await browser.permissions.request({ origins: SITE_ORIGINS });
      if (!granted) return setMessage('Sin permiso no se puede analizar automáticamente.');
    } else {
      await browser.permissions.remove({ origins: SITE_ORIGINS });
    }
    await saveSettings({ autoMode: enabled });
    setMessage(null);
  };

  return (
    <div className="cf-root cf-stack" style={{ maxWidth: 560, margin: '32px auto', padding: 16 }}>
      <h1 style={{ margin: 0 }}>Confinet — Opciones</h1>

      {BACKEND === 'api' && (
        <section className="cf-card cf-stack">
          <h2 className="cf-h2">Cuenta</h2>
          {settings.token ? (
            <>
              <span>✓ Extensión conectada a tu cuenta de Confinet.</span>
              <div className="cf-row">
                <a
                  className="cf-btn"
                  href={`${APP_URL}/historial`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: 'none' }}
                >
                  Ver historial
                </a>
                <button className="cf-btn" onClick={() => saveSettings({ token: null })}>
                  Desconectar
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="cf-muted">
                Sin cuenta puedes usar Confinet con un límite diario pequeño. Con cuenta tendrás más
                análisis con IA y el historial sincronizado con la app.
              </span>
              <button className="cf-btn cf-btn-primary" onClick={connect}>
                Conectar con mi cuenta
              </button>
              <details className="cf-details">
                <summary className="cf-small">¿No funciona? Pega el código manualmente</summary>
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
                    Guardar
                  </button>
                </div>
              </details>
            </>
          )}
        </section>
      )}

      <section className="cf-card cf-stack">
        <h2 className="cf-h2">Análisis automático</h2>
        <label className="cf-row" style={{ alignItems: 'flex-start' }}>
          <input
            type="checkbox"
            checked={settings.autoMode}
            onChange={(e) => toggleAuto(e.target.checked)}
          />
          <span>
            Analizar automáticamente los artículos que abro (sin IA).
            <div className="cf-muted cf-small">
              Requiere permiso para leer las páginas que visitas. Solo se envían a Confinet las
              páginas con aspecto de artículo. Desactivado, Confinet solo actúa cuando pulsas su
              icono.
            </div>
          </span>
        </label>
      </section>

      {message && <div className="cf-note">{message}</div>}

      <p className="cf-muted cf-small">
        <a className="cf-link" href={`${APP_URL}/privacidad`} target="_blank" rel="noreferrer">
          Política de privacidad
        </a>
      </p>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Options />
  </StrictMode>,
);
