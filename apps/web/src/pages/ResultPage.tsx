import { AnalysisView } from '@confinet/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import type { AnalyzeResponse } from '@confinet/core';
import { api, MODE, REPO_URL } from '../api';

const FEEDBACK_OPTIONS = [
  { kind: 'too_high', label: 'Debería ser más baja' },
  { kind: 'too_low', label: 'Debería ser más alta' },
  { kind: 'wrong_signal', label: 'Alguna señal es incorrecta' },
  { kind: 'other', label: 'Otro' },
];

export function ResultPage() {
  const { id = '' } = useParams();
  const { data, error, isLoading } = useQuery({
    queryKey: ['analysis', id],
    queryFn: () => api.analysis(id),
  });

  if (isLoading) return <p className="cf-muted">Cargando…</p>;
  if (error || !data) return <p className="error">{error?.message ?? 'No encontrado'}</p>;

  return (
    <div className="cf-stack">
      <a
        className="cf-link cf-small ellipsis"
        href={data.url}
        target="_blank"
        rel="noreferrer noopener"
      >
        {data.url}
      </a>
      <AnalysisView
        result={data}
        actions={
          MODE === 'static' ? <IssueLink result={data} /> : <FeedbackBox analysisId={data.id} />
        }
      />
      <Link to="/" className="cf-btn" style={{ textAlign: 'center', textDecoration: 'none' }}>
        Analizar otro enlace
      </Link>
    </div>
  );
}

function FeedbackBox({ analysisId }: { analysisId: string }) {
  const [kind, setKind] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const send = useMutation({
    mutationFn: () => api.feedback(analysisId, kind!, comment || undefined),
  });

  if (send.isSuccess)
    return <div className="cf-note cf-small">¡Gracias! Revisaremos tu aviso.</div>;

  return (
    <details className="cf-card cf-details">
      <summary>
        <strong>¿La puntuación no te parece correcta?</strong>
      </summary>
      <div className="cf-stack" style={{ marginTop: 12 }}>
        <div className="cf-row" style={{ flexWrap: 'wrap', gap: 8 }}>
          {FEEDBACK_OPTIONS.map((o) => (
            <button
              key={o.kind}
              type="button"
              className={`cf-btn ${kind === o.kind ? 'cf-btn-primary' : ''}`}
              onClick={() => setKind(o.kind)}
            >
              {o.label}
            </button>
          ))}
        </div>
        <textarea
          className="input"
          rows={3}
          maxLength={1000}
          placeholder="Cuéntanos por qué (opcional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <button
          className="cf-btn cf-btn-primary"
          disabled={!kind || send.isPending}
          onClick={() => send.mutate()}
        >
          Enviar
        </button>
        {send.error && <span className="error cf-small">{send.error.message}</span>}
      </div>
    </details>
  );
}

/** Sin servidor no hay buzón de avisos: se abre un issue de GitHub ya rellenado. */
function IssueLink({ result }: { result: AnalyzeResponse }) {
  const body = [
    '**Enlace analizado:** ' + result.url,
    '**Puntuación de Confinet:** ' +
      (result.trust.score ?? 'sin datos') +
      ' (' +
      result.trust.level +
      ')',
    '**¿Qué puntuación esperabas y por qué?**',
    '',
    '',
    '<details><summary>Señales</summary>',
    '',
    ...Object.values(result.trust.pillars).flatMap((p) =>
      p.signals.map(
        (s) => '- ' + s.id + ': ' + Math.round(s.value * 100) + '/100 — ' + s.explanation,
      ),
    ),
    '</details>',
  ].join('\n');
  const url =
    REPO_URL +
    '/issues/new?labels=puntuacion-incorrecta&title=' +
    encodeURIComponent('Puntuación incorrecta: ' + result.domain) +
    '&body=' +
    encodeURIComponent(body);
  return (
    <a
      className="cf-btn"
      style={{ textAlign: 'center', textDecoration: 'none' }}
      href={url}
      target="_blank"
      rel="noreferrer"
    >
      ¿La puntuación no te parece correcta? Avísanos en GitHub
    </a>
  );
}
