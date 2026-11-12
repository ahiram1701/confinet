import type { MessageKey } from '@confinet/i18n';
import { useI18n } from '@confinet/i18n/react';
import { AnalysisView } from '@confinet/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import type { AnalyzeResponse } from '@confinet/core';
import { api, MODE, REPO_URL } from '../api';

const FEEDBACK_OPTIONS: { kind: string; label: MessageKey }[] = [
  { kind: 'too_high', label: 'result.feedbackTooHigh' },
  { kind: 'too_low', label: 'result.feedbackTooLow' },
  { kind: 'wrong_signal', label: 'result.feedbackWrongSignal' },
  { kind: 'other', label: 'result.feedbackOther' },
];

export function ResultPage() {
  const { t, errorText } = useI18n();
  const { id = '' } = useParams();
  const { data, error, isLoading } = useQuery({
    queryKey: ['analysis', id],
    queryFn: () => api.analysis(id),
  });

  if (isLoading) return <p className="cf-muted">{t('common.loading')}</p>;
  if (error || !data) {
    return <p className="error">{error ? errorText(error) : t('common.notFound')}</p>;
  }

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
        {t('result.analyzeAnother')}
      </Link>
    </div>
  );
}

function FeedbackBox({ analysisId }: { analysisId: string }) {
  const { t, errorText } = useI18n();
  const [kind, setKind] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const send = useMutation({
    mutationFn: () => api.feedback(analysisId, kind!, comment || undefined),
  });

  if (send.isSuccess) return <div className="cf-note cf-small">{t('result.feedbackThanks')}</div>;

  return (
    <details className="cf-card cf-details">
      <summary>
        <strong>{t('result.feedbackTitle')}</strong>
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
              {t(o.label)}
            </button>
          ))}
        </div>
        <textarea
          className="input"
          rows={3}
          maxLength={1000}
          placeholder={t('result.feedbackPlaceholder')}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <button
          className="cf-btn cf-btn-primary"
          disabled={!kind || send.isPending}
          onClick={() => send.mutate()}
        >
          {t('common.send')}
        </button>
        {send.error && <span className="error cf-small">{errorText(send.error)}</span>}
      </div>
    </details>
  );
}

/**
 * Sin servidor no hay buzón de avisos: se abre un issue de GitHub ya rellenado. El texto del
 * issue va en español, el idioma del repositorio.
 */
function IssueLink({ result }: { result: AnalyzeResponse }) {
  const { t } = useI18n();
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
      {t('result.reportOnGithub')}
    </a>
  );
}
