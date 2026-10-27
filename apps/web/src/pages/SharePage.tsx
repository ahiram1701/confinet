import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router';
import { toUrl, useAnalyze } from './AnalyzePage';

/**
 * Destino del Web Share Target. Muchas apps mandan el enlace dentro de `text`
 * ("Mira esto https://…") en lugar de en `url`, así que lo buscamos en todos los campos.
 */
export function extractSharedUrl(params: URLSearchParams): string | null {
  for (const key of ['url', 'text', 'title']) {
    const value = params.get(key);
    const match = value?.match(/https?:\/\/[^\s<>"]+/i);
    if (match) return toUrl(match[0]);
  }
  return null;
}

export function SharePage() {
  const [params] = useSearchParams();
  const analyze = useAnalyze();
  const url = extractSharedUrl(params);
  const started = useRef(false);

  useEffect(() => {
    if (url && !started.current) {
      started.current = true;
      analyze.mutate(url);
    }
  }, [url, analyze]);

  if (!url) {
    return (
      <div className="cf-card cf-stack">
        <strong>No se encontró ningún enlace en lo que has compartido.</strong>
        <Link to="/" className="cf-link">
          Pegar un enlace manualmente
        </Link>
      </div>
    );
  }

  return (
    <div className="cf-card cf-stack">
      <strong>{analyze.isError ? 'No se pudo analizar' : 'Analizando…'}</strong>
      <span className="cf-muted cf-small ellipsis">{url}</span>
      {analyze.error && <span className="error">{analyze.error.message}</span>}
    </div>
  );
}
