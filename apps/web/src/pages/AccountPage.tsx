import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { api, MODE } from '../api';
import { authClient } from '../auth-client';
import { useMe } from '../Layout';
import { StaticAccountPage } from './StaticAccountPage';

export function AccountPage() {
  return MODE === 'static' ? <StaticAccountPage /> : <ServerAccountPage />;
}

function ServerAccountPage() {
  const { data: me, isLoading } = useMe();
  if (isLoading) return <p className="cf-muted">Cargando…</p>;
  return me?.user ? <SignedIn /> : <SignIn />;
}

function SignIn() {
  const [params] = useSearchParams();
  const next = params.get('next') ?? '/cuenta';
  const { data: config } = useQuery({ queryKey: ['config'], queryFn: api.config });
  const queryClient = useQueryClient();

  const social = (provider: 'google' | 'github') =>
    authClient.signIn.social({ provider, callbackURL: next });

  return (
    <div className="cf-stack">
      <div className="cf-card cf-stack">
        <h1 style={{ margin: 0, fontSize: 22 }}>Inicia sesión</h1>
        <p className="cf-muted" style={{ margin: 0 }}>
          Con una cuenta tienes más análisis con IA al día, historial sincronizado con la extensión
          y puedes usar tu propia clave de IA.
        </p>
        {config?.oauth.google && (
          <button className="cf-btn" onClick={() => social('google')}>
            Continuar con Google
          </button>
        )}
        {config?.oauth.github && (
          <button className="cf-btn" onClick={() => social('github')}>
            Continuar con GitHub
          </button>
        )}
        {config && !config.oauth.google && !config.oauth.github && !config.devLogin && (
          <p className="cf-muted cf-small">
            El inicio de sesión no está configurado en este servidor.
          </p>
        )}
      </div>
      {config?.devLogin && (
        <DevLogin onDone={() => queryClient.invalidateQueries({ queryKey: ['me'] })} />
      )}
    </div>
  );
}

/** Solo en local/CI (ENABLE_DEV_LOGIN): email + contraseña sin verificación. */
function DevLogin({ onDone }: { onDone: () => void }) {
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
      <strong>Acceso de desarrollo</strong>
      <span className="cf-muted cf-small">Solo visible con ENABLE_DEV_LOGIN=true.</span>
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
        placeholder="contraseña (mín. 8)"
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <span className="error cf-small">{error}</span>}
      <button className="cf-btn cf-btn-primary" type="submit">
        Entrar / registrarse
      </button>
    </form>
  );
}

function SignedIn() {
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
            Cerrar sesión
          </button>
        </div>
        <span className="cf-muted cf-small">
          Uso de hoy: {me.usage.analyses}/{me.limits.analyses} análisis · {me.usage.ai}/
          {me.limits.ai} con IA del servidor
        </span>
      </div>
      <ByokForm />
      <ExtensionTokens />
    </div>
  );
}

function ByokForm() {
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
      <h2 className="cf-h2">Tu propio modelo de IA (opcional)</h2>
      <p className="cf-muted cf-small" style={{ margin: 0 }}>
        Usa tu clave de cualquier proveedor (Anthropic, OpenAI, Gemini, Mistral, Groq, OpenRouter…)
        o un servidor compatible con OpenAI. Tus análisis con IA serán ilimitados y la clave se
        guarda cifrada; nunca se vuelve a mostrar.
      </p>
      {current && (
        <div className="cf-note cf-small">
          Configurado: <strong>{current.provider}</strong> / {current.model}
          {current.hasKey ? ' · clave guardada' : ''}
        </div>
      )}
      <label className="field">
        Proveedor
        <select
          className="input"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          required
        >
          <option value="" disabled>
            Elige un proveedor…
          </option>
          {providers?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Modelo
        <input
          className="input"
          placeholder="Nombre exacto del modelo"
          required
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />
      </label>
      <label className="field">
        API key{' '}
        {current?.hasKey && (
          <span className="cf-muted">(déjala vacía para conservar la actual)</span>
        )}
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
          URL base (debe ser accesible públicamente)
          <input
            className="input"
            type="url"
            placeholder="https://…/v1"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
          />
        </label>
      )}
      {save.error && <span className="error cf-small">{save.error.message}</span>}
      {save.isSuccess && <span className="cf-small">Guardado.</span>}
      <div className="cf-row">
        <button className="cf-btn cf-btn-primary" type="submit" disabled={save.isPending}>
          Guardar
        </button>
        {current && (
          <button className="cf-btn" type="button" onClick={() => remove.mutate()}>
            Quitar
          </button>
        )}
      </div>
    </form>
  );
}

function ExtensionTokens() {
  const queryClient = useQueryClient();
  const { data: tokens } = useQuery({ queryKey: ['tokens'], queryFn: api.extensionTokens });
  const revoke = useMutation({
    mutationFn: api.revokeExtensionToken,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tokens'] }),
  });

  return (
    <div className="cf-card">
      <h2 className="cf-h2">Extensiones conectadas</h2>
      {tokens?.length === 0 && (
        <p className="cf-muted cf-small" style={{ margin: 0 }}>
          Ninguna. Abre las opciones de la extensión y pulsa «Conectar con mi cuenta».
        </p>
      )}
      {tokens?.map((t) => (
        <div className="list-item" key={t.id}>
          <div style={{ flex: 1 }}>
            <strong>{t.label}</strong>
            <div className="cf-muted cf-small">
              Conectada {new Date(t.createdAt).toLocaleDateString('es')}
              {t.lastUsedAt
                ? ` · último uso ${new Date(t.lastUsedAt).toLocaleDateString('es')}`
                : ''}
            </div>
          </div>
          <button className="cf-btn" onClick={() => revoke.mutate(t.id)}>
            Desconectar
          </button>
        </div>
      ))}
    </div>
  );
}
