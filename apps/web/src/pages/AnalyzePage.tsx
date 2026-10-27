import { isHttpUrl, type AnalyzeRequest } from '@confinet/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { api, ApiError, MODE, REPO_URL } from '../api';
import { useMe } from '../Layout';

export function useAnalyze() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: string | AnalyzeRequest) =>
      api.analyze(typeof req === 'string' ? { url: req } : req),
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

  return (
    <div className="cf-stack" style={{ gap: 20 }}>
      <section className="hero">
        <h1>¿Te puedes fiar de lo que estás leyendo?</h1>
        <p className="cf-muted">
          Pega el enlace de una noticia o artículo y Confinet analizará la fuente, el contenido y el
          tono para darte una puntuación de confianza explicada.
        </p>
      </section>

      {MODE === 'static' && (
        <div className="cf-note cf-small" data-testid="static-note">
          Esta versión funciona sin servidor. Para analizar un enlace pegado aquí,{' '}
          <Link className="cf-link" to="/cuenta">
            inicia sesión en Puter
          </Link>{' '}
          (gratis), o usa la{' '}
          <a
            className="cf-link"
            href={`${REPO_URL}/blob/main/docs/guia-de-uso.md#3-instalar-la-extensión`}
          >
            extensión de Confinet
          </a>{' '}
          directamente en la página.
        </div>
      )}

      <form className="cf-card cf-stack" onSubmit={submit} noValidate>
        <label className="field" htmlFor="url">
          Enlace a analizar
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
        {invalid && <span className="error cf-small">Escribe un enlace válido (https://…).</span>}
        {analyze.error && (
          <span className="error cf-small" role="alert">
            {analyze.error.message}{' '}
            {analyze.error instanceof ApiError && analyze.error.code === 'needs_puter' && (
              <Link className="cf-link" to="/cuenta">
                Ir a Cuenta
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
            {analyze.isPending ? 'Analizando…' : 'Analizar'}
          </button>
          {'clipboard' in navigator && (
            <button className="cf-btn" type="button" onClick={paste}>
              Pegar
            </button>
          )}
        </div>
        {me && MODE === 'api' && (
          <span className="cf-muted cf-small">
            Hoy: {me.usage.analyses}/{me.limits.analyses} análisis · {me.usage.ai}/{me.limits.ai}{' '}
            con IA
            {me.llm ? ' (más ilimitados con tu propia clave)' : ''}
          </span>
        )}
      </form>

      <section className="cf-card cf-stack">
        <h2 className="cf-h2">Cómo funciona</h2>
        <div className="cf-small">
          <p style={{ marginTop: 0 }}>
            <strong>Fuente</strong> — reputación del medio, antigüedad del dominio y transparencia.
          </p>
          <p>
            <strong>Contenido</strong> — autoría, fecha, enlaces a fuentes, titulares
            sensacionalistas y publicidad.
          </p>
          <p style={{ marginBottom: 0 }}>
            <strong>Análisis IA</strong> — tono, falacias, afirmaciones sin respaldo y
            verificaciones externas.
          </p>
        </div>
        <p className="cf-muted cf-small" style={{ margin: 0 }}>
          En Android puedes usar <em>Compartir → Confinet</em> desde cualquier app tras instalar la
          aplicación. En iPhone, copia el enlace y pulsa «Pegar».
        </p>
      </section>
    </div>
  );
}
