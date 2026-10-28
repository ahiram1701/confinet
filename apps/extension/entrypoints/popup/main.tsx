import '@confinet/ui/styles.css';
import './popup.css';
import { LevelBadge, PillarBars, ScoreGauge, AnalysisView } from '@confinet/ui';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { encodeHandoff } from '@confinet/core';
import { APP_URL, BACKEND, getSettings } from '../../lib/config';
import { getTabState, onTabStateChange, type Message, type TabState } from '../../lib/state';
import { getAvailableUpdate, type UpdateInfo } from '../../lib/updates';

const UPDATE_GUIDE =
  'https://github.com/ahiram1701/confinet/blob/main/docs/guia-de-uso.md#actualizaciones';

function Popup() {
  const [tabId, setTabId] = useState<number | null>(null);
  const [state, setState] = useState<TabState | null>(null);
  const [connected, setConnected] = useState(true);
  const [fatal, setFatal] = useState<string | null>(null);
  const [update, setUpdate] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    getSettings().then((s) => setConnected(!!s.token));
    getAvailableUpdate().then(setUpdate);
    // ?tabId=… permite abrir el popup como pestaña para otra página (lo usan los tests E2E).
    const forced = Number(new URLSearchParams(location.search).get('tabId'));
    const target = forced
      ? Promise.resolve(forced)
      : browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => tab?.id);
    target.then(async (id) => {
      if (id == null) return;
      setTabId(id);
      setState(await getTabState(id));
      analyze(id, false);
    });
  }, []);

  useEffect(() => (tabId == null ? undefined : onTabStateChange(tabId, setState)), [tabId]);

  const analyze = (id: number, force: boolean) => {
    setFatal(null);
    browser.runtime
      .sendMessage({ type: 'analyze', tabId: id, force } satisfies Message)
      .then((res: { ok: boolean; error?: string }) => !res?.ok && setFatal(res?.error ?? 'Error'));
  };

  return (
    <div className="cf-root popup cf-stack">
      <header className="cf-row" style={{ justifyContent: 'space-between' }}>
        <strong className="cf-row" style={{ gap: 8 }}>
          <img src="/icon/32.png" width={20} height={20} alt="" /> Confinet
        </strong>
        <button
          className="cf-btn"
          onClick={() => browser.runtime.openOptionsPage()}
          title="Opciones"
        >
          ⚙
        </button>
      </header>

      {update && (
        <div className="cf-note cf-small" data-testid="update">
          Hay una versión nueva de Confinet (<strong>{update.latest}</strong>).{' '}
          <a className="cf-link" href={update.url} target="_blank" rel="noreferrer">
            Descargar
          </a>{' '}
          ·{' '}
          <a className="cf-link" href={UPDATE_GUIDE} target="_blank" rel="noreferrer">
            Cómo actualizar
          </a>
        </div>
      )}

      {fatal && <div className="cf-note">{fatal}</div>}
      {!fatal && <Body state={state} />}

      {state?.status === 'done' && (
        <div className="cf-row">
          <a
            className="cf-btn cf-btn-primary"
            style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}
            href={`${APP_URL}/resultado/${state.result.id}`}
            target="_blank"
            rel="noreferrer"
          >
            Ver detalles / informar error
          </a>
          <button
            className="cf-btn"
            onClick={() => tabId != null && analyze(tabId, true)}
            title="Volver a analizar"
          >
            ↻
          </button>
        </div>
      )}

      {state?.status === 'local' && (
        <button
          className="cf-btn cf-btn-primary"
          onClick={async () => {
            // La página ya extraída viaja en el fragmento de la URL (no llega a ningún servidor).
            const data = await encodeHandoff({ url: state.url, extracted: state.page });
            await browser.tabs.create({ url: `${APP_URL}/analizar#data=${data}` });
          }}
        >
          Análisis completo en Confinet
        </button>
      )}

      {BACKEND === 'api' && !connected && (
        <p className="cf-muted cf-small" style={{ margin: 0 }}>
          <a className="cf-link" href="#" onClick={() => browser.runtime.openOptionsPage()}>
            Conecta tu cuenta
          </a>{' '}
          para tener más análisis con IA e historial.
        </p>
      )}
    </div>
  );
}

function Body({ state }: { state: TabState | null }) {
  if (!state || state.status === 'extracting')
    return <p className="cf-muted">Leyendo la página…</p>;

  if (state.status === 'done') return <AnalysisView result={state.result} compact />;

  const quick = state.quick;
  return (
    <div className="cf-stack">
      {quick && (
        <div className="cf-card cf-row">
          <ScoreGauge score={quick.score} level={quick.level} size={64} />
          <div className="cf-stack" style={{ gap: 4, minWidth: 0 }}>
            <LevelBadge level={quick.level} />
            <span className="cf-small ellipsis">{state.title}</span>
            <span className="cf-muted cf-small">Estimación rápida (solo contenido)</span>
          </div>
        </div>
      )}
      {quick && (
        <div className="cf-card">
          <PillarBars pillars={quick.pillars} />
        </div>
      )}
      {state.status === 'local' && (
        <p className="cf-muted cf-small" style={{ margin: 0 }}>
          Para añadir la reputación del medio, la antigüedad del dominio y (si la activaste) la IA,
          abre el análisis completo.
        </p>
      )}
      {state.status === 'quick' && (
        <p className="cf-muted cf-small">Consultando reputación y análisis con IA…</p>
      )}
      {state.status === 'error' && <div className="cf-note">{state.error}</div>}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Popup />
  </StrictMode>,
);
