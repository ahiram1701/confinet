import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { listOllamaModels, listPuterModels, type ModelOption } from '../backends/static/ai';
import { isPuterSignedIn, loadPuter, signInPuter, signOutPuter } from '../backends/static/puter';
import {
  forgetOllamaKey,
  getAiSettings,
  saveAiSettings,
  type AiProvider,
  type AiSettings,
} from '../backends/static/settings';
import { clearHistory, getHistory } from '../backends/static/store';

const PROVIDER_LABELS: Record<AiProvider, string> = {
  none: 'Ninguno (solo heurísticas)',
  puter: 'Puter',
  'ollama-cloud': 'Ollama Cloud',
};

/** «Cuenta» en la versión sin servidor: todo se guarda en este navegador. */
export function StaticAccountPage() {
  return (
    <div className="cf-stack">
      <h1 style={{ margin: 0, fontSize: 22 }}>Cuenta y ajustes</h1>
      <PuterCard />
      <AiCard />
      <LocalDataCard />
    </div>
  );
}

function usePuterSession() {
  return useQuery({ queryKey: ['puter-session'], queryFn: isPuterSignedIn, staleTime: 30_000 });
}

function PuterCard() {
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
        Sesión de Puter
      </h2>
      <p className="cf-muted cf-small" style={{ margin: 0 }}>
        Esta versión de Confinet no tiene servidor. Para analizar un enlace que pegues aquí, la
        página se descarga a través de <strong>Puter</strong> (gratis, con tu propia cuenta). Si
        usas la extensión de Confinet no hace falta: la extensión lee la página directamente.
      </p>
      {isLoading ? (
        <span className="cf-muted cf-small">Comprobando…</span>
      ) : signedIn ? (
        <div className="cf-row" style={{ justifyContent: 'space-between' }}>
          <span>✓ Sesión de Puter iniciada</span>
          <button className="cf-btn" onClick={() => signOut.mutate()}>
            Cerrar sesión de Puter
          </button>
        </div>
      ) : (
        <button
          className="cf-btn cf-btn-primary"
          onClick={() => signIn.mutate()}
          disabled={signIn.isPending}
        >
          {signIn.isPending ? 'Abriendo Puter…' : 'Iniciar sesión con Puter'}
        </button>
      )}
      {signIn.error && (
        <span className="error cf-small">
          No se pudo iniciar sesión: {signIn.error.message}. Si no se abrió ninguna ventana, permite
          las ventanas emergentes para este sitio.
        </span>
      )}
    </section>
  );
}

function AiCard() {
  const queryClient = useQueryClient();
  const { data: puterSignedIn } = usePuterSession();
  const [saved, setSaved] = useState<AiSettings>(getAiSettings);
  const [provider, setProvider] = useState<AiProvider>(saved.provider);
  const [model, setModel] = useState(saved.model ?? '');
  const [ollamaKey, setOllamaKey] = useState(saved.ollamaKey ?? '');
  const [message, setMessage] = useState<string | null>(null);

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
      setMessage('Guardado. Se usará en los próximos análisis.');
      queryClient.invalidateQueries({ queryKey: ['me'] });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const forgetKey = () => {
    forgetOllamaKey();
    const next = getAiSettings();
    setSaved(next);
    setOllamaKey('');
    models.reset();
    setMessage(
      next.provider === 'none'
        ? 'Key borrada. La IA queda desactivada hasta que elijas otro proveedor.'
        : 'Key borrada de este navegador.',
    );
    queryClient.invalidateQueries({ queryKey: ['me'] });
  };

  const groups = [...new Set((models.data ?? []).map((m) => m.group ?? ''))];
  const canLoadModels =
    (provider === 'puter' && puterSignedIn) || (provider === 'ollama-cloud' && ollamaKey.trim());

  return (
    <form className="cf-card cf-stack" onSubmit={submit} aria-labelledby="ai-title">
      <h2 className="cf-h2" id="ai-title">
        Proveedor de IA (opcional)
      </h2>
      <p className="cf-muted cf-small" style={{ margin: 0 }}>
        Sin IA, Confinet puntúa con la fuente y el contenido. Con IA añade el tercer pilar: tono,
        falacias y afirmaciones sin respaldo. Tú eliges proveedor y modelo; no hay ninguno por
        defecto.
      </p>
      <div className="cf-note cf-small" data-testid="ai-current">
        Actual: <strong>{PROVIDER_LABELS[saved.provider]}</strong>
        {saved.model ? ` · ${saved.model}` : ''}
      </div>

      <fieldset className="cf-stack" style={{ border: 0, padding: 0, margin: 0, gap: 8 }}>
        <legend className="field" style={{ marginBottom: 6 }}>
          Proveedor
        </legend>
        {(Object.keys(PROVIDER_LABELS) as AiProvider[]).map((p) => (
          <label key={p} className="cf-row" style={{ gap: 8 }}>
            <input
              type="radio"
              name="provider"
              value={p}
              checked={provider === p}
              onChange={() => changeProvider(p)}
            />
            {PROVIDER_LABELS[p]}
          </label>
        ))}
      </fieldset>

      {provider === 'puter' && (
        <p className="cf-muted cf-small" style={{ margin: 0 }}>
          Gratis para ti: el uso cuenta en tu propia cuenta de Puter, que incluye modelos de Claude,
          GPT, Gemini y otros.{' '}
          {!puterSignedIn && <strong>Inicia sesión en Puter (arriba) para ver los modelos.</strong>}
        </p>
      )}

      {provider === 'ollama-cloud' && (
        <>
          <p className="cf-muted cf-small" style={{ margin: 0 }}>
            Modelos en la nube de Ollama (gpt-oss, DeepSeek, Qwen, GLM…). Se cobra por token a tu
            cuenta de Ollama. Crea la key en{' '}
            <a
              className="cf-link"
              href="https://ollama.com/settings/keys"
              target="_blank"
              rel="noreferrer"
            >
              ollama.com/settings/keys
            </a>
            . Se guarda solo en este navegador.
          </p>
          <label className="field">
            API key de Ollama
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
              <span className="cf-muted cf-small">
                Key guardada en este navegador; se conserva aunque cambies de proveedor.
              </span>
              <button type="button" className="cf-btn" onClick={forgetKey}>
                Olvidar key
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
            {models.isPending ? 'Cargando modelos…' : 'Cargar modelos disponibles'}
          </button>
          {models.error && <span className="error cf-small">{models.error.message}</span>}
          <label className="field">
            Modelo
            {models.data ? (
              <select
                className="input"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                required
              >
                <option value="" disabled>
                  Elige un modelo…
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
                placeholder="Carga la lista o escribe el nombre exacto"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                required
              />
            )}
          </label>
        </div>
      )}

      {message && <span className="cf-small">{message}</span>}
      <button className="cf-btn cf-btn-primary" type="submit">
        Guardar
      </button>
    </form>
  );
}

const modelOption = (m: ModelOption) => (
  <option key={m.id} value={m.id}>
    {m.label}
  </option>
);

function LocalDataCard() {
  const queryClient = useQueryClient();
  const [count, setCount] = useState(() => getHistory().length);
  const clear = () => {
    if (!confirm('¿Borrar todo el historial de este navegador?')) return;
    clearHistory();
    setCount(0);
    queryClient.invalidateQueries({ queryKey: ['history'] });
  };
  return (
    <section className="cf-card cf-stack" aria-labelledby="data-title">
      <h2 className="cf-h2" id="data-title">
        Datos en este navegador
      </h2>
      <p className="cf-muted cf-small" style={{ margin: 0 }}>
        Tu historial ({count} análisis) y tus ajustes se guardan solo en este navegador. No se
        envían a ningún servidor de Confinet ni se sincronizan entre dispositivos.
      </p>
      <button className="cf-btn" onClick={clear} disabled={count === 0}>
        Borrar historial
      </button>
    </section>
  );
}
