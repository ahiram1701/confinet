import { useI18n } from '@confinet/i18n/react';
import { useMutation } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import { api } from '../api';
import { useMe } from '../Layout';

/**
 * La extensión abre esta página con ?ext=<id>. Creamos un token y se lo enviamos con
 * chrome.runtime.sendMessage (la extensión declara esta web en `externally_connectable`).
 * Si el navegador no lo permite, mostramos el token para copiarlo a mano.
 */
export function ConnectExtensionPage() {
  const { t, errorText } = useI18n();
  const [params] = useSearchParams();
  const extId = params.get('ext');
  const { data: me, isLoading } = useMe();

  const connect = useMutation({
    mutationFn: async () => {
      const { token } = await api.createExtensionToken(browserLabel());
      const sent = extId ? await sendToExtension(extId, token) : false;
      return { token, sent };
    },
  });

  if (isLoading) return <p className="cf-muted">{t('common.loading')}</p>;

  if (!me?.user) {
    const next = `/conectar-extension${extId ? `?ext=${encodeURIComponent(extId)}` : ''}`;
    return (
      <div className="cf-card cf-stack">
        <strong>{t('connect.signInFirst')}</strong>
        <Link
          className="cf-btn cf-btn-primary"
          style={{ textAlign: 'center', textDecoration: 'none' }}
          to={`/cuenta?next=${encodeURIComponent(next)}`}
        >
          {t('common.signIn')}
        </Link>
      </div>
    );
  }

  if (connect.data?.sent) {
    return (
      <div className="cf-card cf-stack">
        <strong>{t('connect.done')}</strong>
        <span className="cf-muted">{t('connect.closeTab')}</span>
      </div>
    );
  }

  return (
    <div className="cf-card cf-stack">
      <h1 style={{ margin: 0, fontSize: 22 }}>{t('connect.title')}</h1>
      <p className="cf-muted" style={{ margin: 0 }}>
        {t('connect.intro', { email: me.user.email })}
      </p>
      {!connect.data && (
        <button
          className="cf-btn cf-btn-primary"
          onClick={() => connect.mutate()}
          disabled={connect.isPending}
        >
          {t('connect.connect')}
        </button>
      )}
      {connect.error && <span className="error">{errorText(connect.error)}</span>}
      {connect.data && !connect.data.sent && (
        <div className="cf-stack">
          <span>{t('connect.manual')}</span>
          <input
            className="input"
            readOnly
            value={connect.data.token}
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>
      )}
    </div>
  );
}

function browserLabel() {
  const ua = navigator.userAgent;
  const name = /Edg\//.test(ua)
    ? 'Edge'
    : /Brave/.test(ua)
      ? 'Brave'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : 'Navegador';
  return `Extensión (${name})`;
}

function sendToExtension(extId: string, token: string): Promise<boolean> {
  const runtime = (globalThis as { chrome?: typeof chrome }).chrome?.runtime;
  if (!runtime?.sendMessage) return Promise.resolve(false);
  return new Promise((resolve) => {
    try {
      runtime.sendMessage(
        extId,
        { type: 'confinet:token', token, origin: location.origin },
        (reply: unknown) => {
          resolve(!runtime.lastError && (reply as { ok?: boolean } | undefined)?.ok === true);
        },
      );
    } catch {
      resolve(false);
    }
  });
}
