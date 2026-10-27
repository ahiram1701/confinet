import { decodeHandoff } from '@confinet/core';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useAnalyze } from './AnalyzePage';

/**
 * Destino de «Análisis completo» en la extensión: recibe la página ya extraída en el
 * fragmento de la URL (#data=…), así no hace falta descargarla de nuevo (ni Puter).
 */
export function HandoffPage() {
  const analyze = useAnalyze();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const data = new URLSearchParams(location.hash.slice(1)).get('data');
    if (!data) {
      setError('No se ha recibido ninguna página para analizar.');
      return;
    }
    decodeHandoff(data)
      .then((req) => analyze.mutate(req))
      .catch(() => setError('Los datos recibidos de la extensión no son válidos.'));
  }, [analyze]);

  const message = error ?? analyze.error?.message;
  return (
    <div className="cf-card cf-stack" role="status">
      <strong>{message ? 'No se pudo analizar' : 'Analizando la página…'}</strong>
      {message && <span className="error">{message}</span>}
      {message && (
        <Link to="/" className="cf-link">
          Volver al inicio
        </Link>
      )}
    </div>
  );
}
