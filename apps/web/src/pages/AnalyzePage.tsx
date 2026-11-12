import { isHttpUrl, type AnalyzeRequest } from '@confinet/core';
import { useI18n } from '@confinet/i18n/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { api, ApiError, MODE, REPO_URL } from '../api';
import { useMe } from '../Layout';

export function useAnalyze() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { locale } = useI18n();
  return useMutation({
    // La IA escribe en el idioma de la interfaz (o en el que pidió la extensión al traspasar).
    mutationFn: (req: string | AnalyzeRequest) =>
      api.analyze(typeof req === 'string' ? { url: req, locale } : { locale, ...req }),
    onSuccess: (result) => {
      queryClient.setQueryData(['analysis', result.id], result);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
      navigate(`/resultado/${result.id}`);
    },
  });
}

/** Acepta "elpais.com/x" sin protocolo, como escribe la gente en el móvil. */
export function toUrl(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return isHttpUrl(withProtocol) && withProtocol.includes('.') ? withProtocol : null;
}

export function AnalyzePage() {
  const { t, rich, errorText } = useI18n();
  const [params] = useSearchParams();
  // ?url=… permite abrir Confinet con el enlace ya escrito (p. ej. desde un marcador).
  const [input, setInput] = useState(params.get('url') ?? '');
  const [invalid, setInvalid] = useState(false);
  const analyze = useAnalyze();
  const { data: me } = useMe();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const url = toUrl(input);
    setInvalid(!url);
    if (url) analyze.mutate(url);
  };

  const paste = async () => {
    try {
      setInput(await navigator.clipboard.readText());
    } catch {
      // El navegador no permite leer el portapapeles: el usuario pega a mano.
    }
  };

  const bold = (s: string) => <strong>{s}</strong>;

  return (
    <div className="cf-stack" style={{ gap: 20 }}>
      <section className="hero">
        <h1>{t('home.title')}</h1>
        <p className="cf-muted">{t('home.intro')}</p>
      </section>

      {MODE === 'static' && (
        <div className="cf-note cf-small" data-testid="static-note">
          {rich('home.staticNote', {
            puter: (s) => (
              <Link className="cf-link" to="/cuenta">
                {s}
              </Link>
            ),
            ext: (s) => (
              <a className="cf-link" href={`${REPO_URL}/blob/main/${t('guide.installExtension')}`}>
                {s}
              </a>
            ),
          })}
        </div>
      )}

      <form className="cf-card cf-stack" onSubmit={submit} noValidate>
        <label className="field" htmlFor="url">
          {t('home.urlLabel')}
          <input
            id="url"
            className="input"
            type="text"
            inputMode="url"
            autoComplete="off"
            placeholder="https://…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </label>
        {invalid && <span className="error cf-small">{t('home.invalidUrl')}</span>}
        {analyze.error && (
          <span className="error cf-small" role="alert">
            {errorText(analyze.error)}{' '}
            {analyze.error instanceof ApiError && analyze.error.code === 'needs_puter' && (
              <Link className="cf-link" to="/cuenta">
                {t('home.goToAccount')}
              </Link>
            )}
          </span>
        )}
        <div className="cf-row">
          <button
            className="cf-btn cf-btn-primary"
            type="submit"
            disabled={analyze.isPending}
            style={{ flex: 1 }}
          >
            {analyze.isPending ? t('home.analyzing') : t('home.analyze')}
          </button>
          {'clipboard' in navigator && (
            <button className="cf-btn" type="button" onClick={paste}>
              {t('home.paste')}
            </button>
          )}
        </div>
        {me && MODE === 'api' && (
          <span className="cf-muted cf-small">
            {t('home.usage', {
              analyses: me.usage.analyses,
              maxAnalyses: me.limits.analyses,
              ai: me.usage.ai,
              maxAi: me.limits.ai,
            })}
            {me.llm ? t('home.usageByok') : ''}
          </span>
        )}
      </form>

      <section className="cf-card cf-stack">
        <h2 className="cf-h2">{t('home.howItWorks')}</h2>
        <div className="cf-small">
          <p style={{ marginTop: 0 }}>{rich('home.howSource', { b: bold })}</p>
          <p>{rich('home.howContent', { b: bold })}</p>
          <p style={{ marginBottom: 0 }}>{rich('home.howAi', { b: bold })}</p>
        </div>
        <p className="cf-muted cf-small" style={{ margin: 0 }}>
          {rich('home.mobileTip', { i: (s) => <em>{s}</em> })}
        </p>
      </section>
    </div>
  );
}
