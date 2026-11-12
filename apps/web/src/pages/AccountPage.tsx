import { formatDate } from '@confinet/i18n';
import { useI18n } from '@confinet/i18n/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { api, MODE } from '../api';
import { authClient } from '../auth-client';
import { LanguageCard } from '../LanguageCard';
import { useMe } from '../Layout';
import { StaticAccountPage } from './StaticAccountPage';

export function AccountPage() {
  return MODE === 'static' ? <StaticAccountPage /> : <ServerAccountPage />;
}

function ServerAccountPage() {
  const { t } = useI18n();
  const { data: me, isLoading } = useMe();
  if (isLoading) return <p className="cf-muted">{t('common.loading')}</p>;
  return me?.user ? <SignedIn /> : <SignIn />;
}

function SignIn() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const next = params.get('next') ?? '/cuenta';
  const { data: config } = useQuery({ queryKey: ['config'], queryFn: api.config });
  const queryClient = useQueryClient();

  const social = (provider: 'google' | 'github') =>
    authClient.signIn.social({ provider, callbackURL: next });

  return (
    <div className="cf-stack">
      <div className="cf-card cf-stack">
        <h1 style={{ margin: 0, fontSize: 22 }}>{t('account.signInTitle')}</h1>
        <p className="cf-muted" style={{ margin: 0 }}>
          {t('account.signInIntro')}
        </p>
        {config?.oauth.google && (
          <button className="cf-btn" onClick={() => social('google')}>
            {t('account.continueGoogle')}
          </button>
        )}
        {config?.oauth.github && (
          <button className="cf-btn" onClick={() => social('github')}>
            {t('account.continueGithub')}
          </button>
        )}
        {config && !config.oauth.google && !config.oauth.github && !config.devLogin && (
          <p className="cf-muted cf-small">{t('account.noLogin')}</p>
        )}
      </div>
      {config?.devLogin && (
        <DevLogin onDone={() => queryClient.invalidateQueries({ queryKey: ['me'] })} />
      )}
      <LanguageCard />
    </div>
  );
}

/** Solo en local/CI (ENABLE_DEV_LOGIN): email + contraseña sin verificación. */
function DevLogin({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const signIn = await authClient.signIn.email({ email, password });
    if (signIn.error) {
      const signUp = await authClient.signUp.email({
        email,
        password,
        name: email.split('@')[0] ?? email,
      });
      if (signUp.error) return setError(signUp.error.message ?? 'Error');
    }
    onDone();
  };

  return (
    <form className="cf-card cf-stack" onSubmit={submit} data-testid="dev-login">
      <strong>{t('account.devTitle')}</strong>
      <span className="cf-muted cf-small">{t('account.devHelp')}</span>
      <input
        className="input"
        type="email"
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        className="input"
        type="password"
        placeholder={t('account.devPassword')}
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <span className="error cf-small">{error}</span>}
      <button className="cf-btn cf-btn-primary" type="submit">
        {t('account.devSubmit')}
      </button>
    </form>
  );
}

function SignedIn() {
  const { t } = useI18n();
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const signOut = async () => {
    await authClient.signOut();
    queryClient.clear();
  };
  if (!me?.user) return null;

  return (
    <div className="cf-stack">
      <div className="cf-card cf-stack">
        <div className="cf-row" style={{ justifyContent: 'space-between' }}>
          <div>
            <strong>{me.user.name}</strong>
            <div className="cf-muted cf-small">{me.user.email}</div>
          </div>
          <button className="cf-btn" onClick={signOut}>
            {t('common.signOut')}
          </button>
        </div>
        <span className="cf-muted cf-small">
          {t('account.usageToday', {
            analyses: me.usage.analyses,
            maxAnalyses: me.limits.analyses,
            ai: me.usage.ai,
            maxAi: me.limits.ai,
          })}
        </span>
      </div>
      <ByokForm />
      <ExtensionTokens />
      <LanguageCard />
    </div>
  );
}

function ByokForm() {
  const { t, rich, errorText } = useI18n();
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const { data: providers } = useQuery({ queryKey: ['providers'], queryFn: api.providers });
  const current = me?.llm;
  // Sin proveedor ni modelo por defecto: el usuario los elige.
  const [provider, setProvider] = useState(current?.provider ?? '');
  const [model, setModel] = useState(current?.model ?? '');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(current?.baseUrl ?? '');

  const needsBaseUrl =
    provider === 'openai-compatible' || provider === 'ollama' || provider === 'workers-ai';

  const save = useMutation({
    mutationFn: () =>
      api.saveLlm({
        provider,
        model: model.trim(),
        ...(apiKey ? { apiKey } : {}),
        ...(baseUrl ? { baseUrl } : {}),
      }),
    onSuccess: () => {
      setApiKey('');
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
  const remove = useMutation({
    mutationFn: api.deleteLlm,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  });

  return (
    <form
      className="cf-card cf-stack"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <h2 className="cf-h2">{t('account.byokTitle')}</h2>
      <p className="cf-muted cf-small" style={{ margin: 0 }}>
        {t('account.byokIntro')}
      </p>
      {current && (
        <div className="cf-note cf-small">
          {rich(
            'account.byokCurrent',
            { b: (s) => <strong>{s}</strong> },
            {
              provider: current.provider,
              model: current.model,
              key: current.hasKey ? t('account.byokKeySaved') : '',
            },
          )}
        </div>
      )}
      <label className="field">
        {t('account.provider')}
        <select
          className="input"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          required
        >
          <option value="" disabled>
            {t('account.pickProvider')}
          </option>
          {providers?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        {t('account.model')}
        <input
          className="input"
          placeholder={t('account.modelPlaceholder')}
          required
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />
      </label>
      <label className="field">
        API key {current?.hasKey && <span className="cf-muted">{t('account.keepKey')}</span>}
        <input
          className="input"
          type="password"
          autoComplete="off"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
      </label>
      {needsBaseUrl && (
        <label className="field">
          {t('account.baseUrl')}
          <input
            className="input"
            type="url"
            placeholder="https://…/v1"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
          />
        </label>
      )}
      {save.error && <span className="error cf-small">{errorText(save.error)}</span>}
      {save.isSuccess && <span className="cf-small">{t('account.saved')}</span>}
      <div className="cf-row">
        <button className="cf-btn cf-btn-primary" type="submit" disabled={save.isPending}>
          {t('common.save')}
        </button>
        {current && (
          <button className="cf-btn" type="button" onClick={() => remove.mutate()}>
            {t('account.remove')}
          </button>
        )}
      </div>
    </form>
  );
}

function ExtensionTokens() {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const { data: tokens } = useQuery({ queryKey: ['tokens'], queryFn: api.extensionTokens });
  const revoke = useMutation({
    mutationFn: api.revokeExtensionToken,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tokens'] }),
  });

  return (
    <div className="cf-card">
      <h2 className="cf-h2">{t('account.extensionsTitle')}</h2>
      {tokens?.length === 0 && (
        <p className="cf-muted cf-small" style={{ margin: 0 }}>
          {t('account.extensionsNone')}
        </p>
      )}
      {tokens?.map((token) => (
        <div className="list-item" key={token.id}>
          <div style={{ flex: 1 }}>
            <strong>{token.label}</strong>
            <div className="cf-muted cf-small">
              {t('account.extensionConnected', { date: formatDate(locale, token.createdAt) })}
              {token.lastUsedAt
                ? t('account.extensionLastUsed', { date: formatDate(locale, token.lastUsedAt) })
                : ''}
            </div>
          </div>
          <button className="cf-btn" onClick={() => revoke.mutate(token.id)}>
            {t('account.disconnect')}
          </button>
        </div>
      ))}
    </div>
  );
}
