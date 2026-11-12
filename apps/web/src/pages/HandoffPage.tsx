import { decodeHandoff } from '@confinet/core';
import { useI18n } from '@confinet/i18n/react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useAnalyze } from './AnalyzePage';

/**
 * Destino de «Análisis completo» en la extensión: recibe la página ya extraída en el
 * fragmento de la URL (#data=…), así no hace falta descargarla de nuevo (ni Puter).
 */
export function HandoffPage() {
  const { t, errorText } = useI18n();
  const analyze = useAnalyze();
  const [error, setError] = useState<'handoff.noData' | 'handoff.invalidData' | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const data = new URLSearchParams(location.hash.slice(1)).get('data');
    if (!data) {
      setError('handoff.noData');
      return;
    }
    decodeHandoff(data)
      .then((req) => analyze.mutate(req))
      .catch(() => setError('handoff.invalidData'));
  }, [analyze]);

  const message = error ? t(error) : analyze.error ? errorText(analyze.error) : null;
  return (
    <div className="cf-card cf-stack" role="status">
      <strong>{message ? t('share.failed') : t('handoff.analyzing')}</strong>
      {message && <span className="error">{message}</span>}
      {message && (
        <Link to="/" className="cf-link">
          {t('handoff.backHome')}
        </Link>
      )}
    </div>
  );
}
