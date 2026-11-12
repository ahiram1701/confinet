import {
  PILLAR_WEIGHTS,
  type AnalyzeResponse,
  type Pillar,
  type Signal,
  type TrustLevel,
} from '@confinet/core';
import { formatDate } from '@confinet/i18n';
import { useI18n } from '@confinet/i18n/react';
import type { ReactNode } from 'react';

export const LEVEL_COLORS: Record<TrustLevel, string> = {
  high: 'var(--cf-high)',
  medium: 'var(--cf-medium)',
  low: 'var(--cf-low)',
  unknown: 'var(--cf-unknown)',
};

/** Color para un valor 0–1 o 0–100. */
export function colorFor(value: number | null, scale: 1 | 100 = 100): string {
  if (value == null) return LEVEL_COLORS.unknown;
  const v = scale === 1 ? value * 100 : value;
  return v >= 70 ? LEVEL_COLORS.high : v >= 45 ? LEVEL_COLORS.medium : LEVEL_COLORS.low;
}

export function ScoreGauge({
  score,
  level,
  size = 96,
}: {
  score: number | null;
  level: TrustLevel;
  size?: number;
}) {
  const { t } = useI18n();
  const stroke = Math.max(6, size / 11);
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = score == null ? 0 : (score / 100) * circumference;
  return (
    <div
      className="cf-gauge"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${t(`level.${level}`)}: ${score ?? t('analysis.noData')}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--cf-surface-2)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={LEVEL_COLORS[level]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="cf-gauge-value" style={{ fontSize: size / 3.2, color: LEVEL_COLORS[level] }}>
        {score ?? '–'}
      </span>
    </div>
  );
}

export function LevelBadge({ level }: { level: TrustLevel }) {
  const { t } = useI18n();
  return (
    <span className="cf-level" data-level={level}>
      {t(`level.${level}`)}
    </span>
  );
}

export function PillarBars({ pillars }: { pillars: AnalyzeResponse['trust']['pillars'] }) {
  const { t } = useI18n();
  return (
    <div className="cf-stack" style={{ gap: 10 }}>
      {(Object.keys(PILLAR_WEIGHTS) as Pillar[]).map((p) => {
        const score = pillars[p].score;
        return (
          <div key={p}>
            <div className="cf-row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
              <span>
                {t(`pillar.${p}`)}{' '}
                <span className="cf-muted cf-small">({Math.round(PILLAR_WEIGHTS[p] * 100)}%)</span>
              </span>
              <strong style={{ color: colorFor(score) }}>{score ?? t('analysis.noData')}</strong>
            </div>
            <div className="cf-bar">
              <span style={{ width: `${score ?? 0}%`, background: colorFor(score) }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SignalList({ signals }: { signals: Signal[] }) {
  const { t } = useI18n();
  if (signals.length === 0) return <p className="cf-muted cf-small">{t('analysis.noSignals')}</p>;
  return (
    <div>
      {signals.map((s) => (
        <div className="cf-signal" key={s.id}>
          <span className="cf-dot" style={{ background: colorFor(s.value, 1) }} aria-hidden />
          <div>
            <strong>{t(`signal.${s.id}`)}</strong>
            {/* Los análisis guardados antes de la traducción solo tienen el texto en español. */}
            <div className="cf-muted">{s.message ? t(s.message) : s.explanation}</div>
            {s.evidence && s.evidence.length > 0 && (
              <ul className="cf-evidence">
                {s.evidence.slice(0, 5).map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Vista completa de un análisis (popup de la extensión y pantalla de resultado de la PWA). */
export function AnalysisView({
  result,
  compact = false,
  actions,
}: {
  result: AnalyzeResponse;
  compact?: boolean;
  actions?: ReactNode;
}) {
  const { t, locale } = useI18n();
  const { trust, ai, factChecks } = result;
  return (
    <div className="cf-root cf-stack">
      <div className="cf-card cf-row" style={{ alignItems: 'flex-start' }}>
        <ScoreGauge score={trust.score} level={trust.level} size={compact ? 72 : 96} />
        <div className="cf-stack" style={{ gap: 6, minWidth: 0 }}>
          <LevelBadge level={trust.level} />
          <strong style={{ overflowWrap: 'anywhere' }}>{result.title || result.url}</strong>
          <span className="cf-muted cf-small">
            {result.domain} · {t('analysis.certainty', { pct: Math.round(trust.certainty * 100) })}{' '}
            · {formatDate(locale, result.analyzedAt, { dateStyle: 'short', timeStyle: 'short' })}
          </span>
        </div>
      </div>

      {trust.caps.map((cap) => (
        <div className="cf-alert" key={cap.reason}>
          ⚠ {cap.key ? t(cap.key) : cap.reason}
        </div>
      ))}

      <div className="cf-card">
        <h2 className="cf-h2">{t('analysis.breakdown')}</h2>
        <PillarBars pillars={trust.pillars} />
      </div>

      {ai ? (
        <div className="cf-card">
          <h2 className="cf-h2">{t('analysis.ai')}</h2>
          <p style={{ margin: 0 }}>{ai.summary}</p>
          <p className="cf-muted cf-small" style={{ marginBottom: 0 }}>
            {ai.reasoning} —{' '}
            <em>
              {ai.provider}/{ai.model}
            </em>
          </p>
        </div>
      ) : result.aiUnavailable || result.aiUnavailableReason ? (
        <div className="cf-note cf-small">
          {result.aiUnavailable ? t(result.aiUnavailable) : result.aiUnavailableReason}
        </div>
      ) : null}

      {factChecks.length > 0 && (
        <div className="cf-card">
          <h2 className="cf-h2">{t('analysis.factChecks')}</h2>
          {factChecks.map((f) => (
            <div className="cf-signal" key={f.url}>
              <span
                className="cf-dot"
                style={{
                  background:
                    f.verdict === 'true'
                      ? LEVEL_COLORS.high
                      : f.verdict === 'unknown'
                        ? LEVEL_COLORS.unknown
                        : LEVEL_COLORS.low,
                }}
              />
              <div>
                <strong>
                  {f.publisher}: {f.rating}
                </strong>
                <div className="cf-muted cf-small">{f.claim}</div>
                <a
                  className="cf-link cf-small"
                  href={f.url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {t('analysis.viewFactCheck')}
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {(Object.keys(PILLAR_WEIGHTS) as Pillar[]).map((p) => (
        <details className="cf-card cf-details" key={p} open={!compact && p === 'content'}>
          <summary>
            <strong>{t(`pillar.${p}`)}</strong>{' '}
            <span className="cf-muted cf-small">
              {t('analysis.signalCount', { n: trust.pillars[p].signals.length })}
            </span>
          </summary>
          <SignalList signals={trust.pillars[p].signals} />
        </details>
      ))}

      {actions}

      <p className="cf-muted cf-small" style={{ margin: 0 }}>
        {t('analysis.disclaimer')}
      </p>
    </div>
  );
}
