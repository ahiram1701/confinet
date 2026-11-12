import { testFactCheckKey } from '@confinet/core';
import type { MessageKey } from '@confinet/i18n';
import { useI18n } from '@confinet/i18n/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { listOllamaModels, listPuterModels, type ModelOption } from '../backends/static/ai';
import { isPuterSignedIn, loadPuter, signInPuter, signOutPuter } from '../backends/static/puter';
import {
  forgetFactCheckKey,
  forgetOllamaKey,
  getAiSettings,
  getFactCheckKey,
  saveAiSettings,
  saveFactCheckKey,
  type AiProvider,
  type AiSettings,
} from '../backends/static/settings';
import { clearHistory, getHistory } from '../backends/static/store';
import { LanguageCard } from '../LanguageCard';

const PROVIDERS: AiProvider[] = ['none', 'puter', 'ollama-cloud'];

function useProviderLabel() {
  const { t } = useI18n();
  return (p: AiProvider) =>
    p === 'none' ? t('staticAccount.providerNone') : p === 'puter' ? 'Puter' : 'Ollama Cloud';
}

/** «Cuenta» en la versión sin servidor: todo se guarda en este navegador. */
export function StaticAccountPage() {
  const { t } = useI18n();
  return (
    <div className="cf-stack">
      <h1 style={{ margin: 0, fontSize: 22 }}>{t('staticAccount.title')}</h1>
      <PuterCard />
      <AiCard />
      <FactCheckCard />
      <LanguageCard />
      <LocalDataCard />
    </div>
  );
}

function usePuterSession() {
  return useQuery({ queryKey: ['puter-session'], queryFn: isPuterSignedIn, staleTime: 30_000 });
}

function PuterCard() {
  const { t, rich, errorText } = useI18n();
  const queryClient = useQueryClient();
  const { data: signedIn, isLoading } = usePuterSession();
  // Precargamos puter.js para que la ventana de login se abra dentro del clic (si no, el
  // bloqueador de ventanas emergentes podría impedirlo).
  useEffect(() => {
    loadPuter().catch(() => undefined);
  }, []);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['puter-session'] });
  const signIn = useMutation({ mutationFn: signInPuter, onSettled: refresh });
  const signOut = useMutation({ mutationFn: signOutPuter, onSettled: refresh });

  return (
    <section className="cf-card cf-stack" aria-labelledby="puter-title">
      <h2 className="cf-h2" id="puter-title">
        {t('staticAccount.puterTitle')}
      </h2>
      <p className="cf-muted cf-small" style={{ margin: 0 }}>
        {rich('staticAccount.puterIntro', { b: (s) => <strong>{s}</strong> })}
      </p>
      {isLoading ? (
        <span className="cf-muted cf-small">{t('staticAccount.checking')}</span>
      ) : signedIn ? (
        <div className="cf-row" style={{ justifyContent: 'space-between' }}>
          <span>{t('staticAccount.puterSignedIn')}</span>
          <button className="cf-btn" onClick={() => signOut.mutate()}>
            {t('staticAccount.puterSignOut')}
          </button>
        </div>
      ) : (
        <button
          className="cf-btn cf-btn-primary"
          onClick={() => signIn.mutate()}
          disabled={signIn.isPending}
        >
          {signIn.isPending ? t('staticAccount.puterOpening') : t('staticAccount.puterSignIn')}
        </button>
      )}
      {signIn.error && (
        <span className="error cf-small">
          {t('staticAccount.puterSignInError', { error: errorText(signIn.error) })}
        </span>
      )}
    </section>
  );
}

function AiCard() {
  const { t, rich, errorText } = useI18n();
  const providerLabel = useProviderLabel();
  const queryClient = useQueryClient();
  const { data: puterSignedIn } = usePuterSession();
  const [saved, setSaved] = useState<AiSettings>(getAiSettings);
  const [provider, setProvider] = useState<AiProvider>(saved.provider);
  const [model, setModel] = useState(saved.model ?? '');
  const [ollamaKey, setOllamaKey] = useState(saved.ollamaKey ?? '');
  // Lo que se muestra junto a «Guardar»: un texto fijo o el error de la última acción.
  const [message, setMessage] = useState<{ key: MessageKey } | { error: unknown } | null>(null);

  const models = useMutation<ModelOption[]>({
    mutationFn: () =>
      provider === 'puter' ? listPuterModels() : listOllamaModels(ollamaKey.trim()),
  });

  const changeProvider = (next: AiProvider) => {
    setProvider(next);
    // Recuperamos el último modelo usado con ese proveedor (la key ya sigue en el formulario).
    setModel(next === 'none' ? '' : (saved.models?.[next] ?? ''));
    setMessage(null);
    models.reset();
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    try {
      const next: AiSettings =
        provider === 'none'
          ? { provider }
          : {
              provider,
              model,
              ...(provider === 'ollama-cloud' ? { ollamaKey: ollamaKey.trim() } : {}),
            };
      saveAiSettings(next);
      setSaved(getAiSettings());
      setMessage({ key: 'staticAccount.saved' });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    } catch (error) {
      setMessage({ error });
    }
  };

  const forgetKey = () => {
    forgetOllamaKey();
    const next = getAiSettings();
    setSaved(next);
    setOllamaKey('');
    models.reset();
    setMessage({
      key:
        next.provider === 'none' ? 'staticAccount.keyForgottenAiOff' : 'staticAccount.keyForgotten',
    });
    queryClient.invalidateQueries({ queryKey: ['me'] });
  };

  const groups = [...new Set((models.data ?? []).map((m) => m.group ?? ''))];
  const canLoadModels =
    (provider === 'puter' && puterSignedIn) || (provider === 'ollama-cloud' && ollamaKey.trim());

  return (
    <form className="cf-card cf-stack" onSubmit={submit} aria-labelledby="ai-title">
      <h2 className="cf-h2" id="ai-title">
        {t('staticAccount.aiTitle')}
      </h2>
      <p className="cf-muted cf-small" style={{ margin: 0 }}>
        {t('staticAccount.aiIntro')}
      </p>
      <div className="cf-note cf-small" data-testid="ai-current">
        {rich(
          'staticAccount.current',
          { b: (s) => <strong>{s}</strong> },
          {
            provider: providerLabel(saved.provider),
            model: saved.model ? ` · ${saved.model}` : '',
          },
        )}
      </div>

      <fieldset className="cf-stack" style={{ border: 0, padding: 0, margin: 0, gap: 8 }}>
        <legend className="field" style={{ marginBottom: 6 }}>
          {t('staticAccount.provider')}
        </legend>
        {PROVIDERS.map((p) => (
          <label key={p} className="cf-row" style={{ gap: 8 }}>
            <input
              type="radio"
              name="provider"
              value={p}
              checked={provider === p}
              onChange={() => changeProvider(p)}
            />
            {providerLabel(p)}
          </label>
        ))}
      </fieldset>

      {provider === 'puter' && (
        <p className="cf-muted cf-small" style={{ margin: 0 }}>
          {t('staticAccount.puterHelp')}{' '}
          {!puterSignedIn && <strong>{t('staticAccount.puterSignInFirst')}</strong>}
        </p>
      )}

      {provider === 'ollama-cloud' && (
        <>
          <p className="cf-muted cf-small" style={{ margin: 0 }}>
            {rich('staticAccount.ollamaHelp', {
              link: (s) => (
                <a
                  className="cf-link"
                  href="https://ollama.com/settings/keys"
                  target="_blank"
                  rel="noreferrer"
                >
                  {s}
                </a>
              ),
            })}
          </p>
          <label className="field">
            {t('staticAccount.ollamaKey')}
            <input
              className="input"
              type="password"
              autoComplete="off"
              value={ollamaKey}
              onChange={(e) => setOllamaKey(e.target.value)}
            />
          </label>
          {saved.ollamaKey && (
            <div className="cf-row" style={{ justifyContent: 'space-between' }}>
              <span className="cf-muted cf-small">{t('staticAccount.keySaved')}</span>
              <button type="button" className="cf-btn" onClick={forgetKey}>
                {t('staticAccount.forgetKey')}
              </button>
            </div>
          )}
        </>
      )}

      {provider !== 'none' && (
        <div className="cf-stack" style={{ gap: 8 }}>
          <button
            type="button"
            className="cf-btn"
            disabled={!canLoadModels || models.isPending}
            onClick={() => models.mutate()}
          >
            {models.isPending ? t('staticAccount.loadingModels') : t('staticAccount.loadModels')}
          </button>
          {models.error && <span className="error cf-small">{errorText(models.error)}</span>}
          <label className="field">
            {t('staticAccount.model')}
            {models.data ? (
              <select
                className="input"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                required
              >
                <option value="" disabled>
                  {t('staticAccount.pickModel')}
                </option>
                {groups.map((g) =>
                  g ? (
                    <optgroup key={g} label={g}>
                      {models.data!.filter((m) => m.group === g).map(modelOption)}
                    </optgroup>
                  ) : (
                    models.data!.filter((m) => !m.group).map(modelOption)
                  ),
                )}
              </select>
            ) : (
              <input
                className="input"
                placeholder={t('staticAccount.modelPlaceholder')}
                value={model}
                onChange={(e) => setModel(e.target.value)}
                required
              />
            )}
          </label>
        </div>
      )}

      {message && (
        <span className="cf-small">
          {'key' in message ? t(message.key) : errorText(message.error)}
        </span>
      )}
      <button className="cf-btn cf-btn-primary" type="submit">
        {t('common.save')}
      </button>
    </form>
  );
}

/** Key de Google Fact Check: igual que la de Ollama, vive solo en este navegador. */
function FactCheckCard() {
  const { t, rich, errorText } = useI18n();
  const [saved, setSaved] = useState(getFactCheckKey);
  const [key, setKey] = useState('');
  const [message, setMessage] = useState<{ key: MessageKey } | { error: unknown } | null>(null);
  const test = useMutation({ mutationFn: (k: string) => testFactCheckKey(k) });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    try {
      saveFactCheckKey(key);
      setSaved(getFactCheckKey());
      setKey('');
      setMessage({ key: 'factcheck.saved' });
    } catch (error) {
      setMessage({ error });
    }
  };

  const forget = () => {
    forgetFactCheckKey();
    setSaved(null);
    test.reset();
    setMessage({ key: 'factcheck.forgotten' });
  };

  const testResult: MessageKey | null =
    test.data === 'ok'
      ? 'factcheck.testOk'
      : test.data === 'rejected'
        ? 'factcheck.testRejected'
        : test.data
          ? 'factcheck.testError'
          : null;

  return (
    <form className="cf-card cf-stack" onSubmit={submit} aria-labelledby="factcheck-title">
      <h2 className="cf-h2" id="factcheck-title">
        {t('factcheck.title')}
      </h2>
      <p className="cf-muted cf-small" style={{ margin: 0 }}>
        {rich('factcheck.intro', { b: (s) => <strong>{s}</strong> })}
      </p>
      <p className="cf-muted cf-small" style={{ margin: 0 }}>
        {rich('factcheck.steps', {
          link: (s) => (
            <a
              className="cf-link"
              href="https://console.cloud.google.com/apis/library/factchecktools.googleapis.com"
              target="_blank"
              rel="noreferrer"
            >
              {s}
            </a>
          ),
        })}
      </p>
      {saved && (
        <div className="cf-row" style={{ justifyContent: 'space-between' }}>
          <span className="cf-small" data-testid="factcheck-active">
            {t('factcheck.active')}
          </span>
          <button type="button" className="cf-btn" onClick={forget}>
            {t('factcheck.forget')}
          </button>
        </div>
      )}
      <label className="field">
        {t('factcheck.key')}
        <input
          className="input"
          type="password"
          autoComplete="off"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
      </label>
      {message && (
        <span className="cf-small">
          {'key' in message ? t(message.key) : errorText(message.error)}
        </span>
      )}
      {testResult && (
        <span className={`cf-small ${test.data === 'ok' ? '' : 'error'}`} role="status">
          {t(testResult)}
        </span>
      )}
      <div className="cf-row">
        <button className="cf-btn cf-btn-primary" type="submit" disabled={!key.trim()}>
          {t('common.save')}
        </button>
        <button
          type="button"
          className="cf-btn"
          disabled={!(key.trim() || saved) || test.isPending}
          onClick={() => test.mutate(key.trim() || saved!)}
        >
          {test.isPending ? t('factcheck.testing') : t('factcheck.test')}
        </button>
      </div>
    </form>
  );
}

const modelOption = (m: ModelOption) => (
  <option key={m.id} value={m.id}>
    {m.label}
  </option>
);

function LocalDataCard() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [count, setCount] = useState(() => getHistory().length);
  const clear = () => {
    if (!confirm(t('staticAccount.clearConfirm'))) return;
    clearHistory();
    setCount(0);
    queryClient.invalidateQueries({ queryKey: ['history'] });
  };
  return (
    <section className="cf-card cf-stack" aria-labelledby="data-title">
      <h2 className="cf-h2" id="data-title">
        {t('staticAccount.dataTitle')}
      </h2>
      <p className="cf-muted cf-small" style={{ margin: 0 }}>
        {t('staticAccount.dataText', { n: count })}
      </p>
      <button className="cf-btn" onClick={clear} disabled={count === 0}>
        {t('staticAccount.clearHistory')}
      </button>
    </section>
  );
}
