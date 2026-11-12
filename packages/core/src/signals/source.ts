import { signal } from '../signal';
import type { DomainReputation, ReputationRating, Signal } from '../types';

export interface SourceInput {
  url: string;
  reputation?: DomainReputation | null;
  /** Días desde el registro del dominio (RDAP). */
  domainAgeDays?: number | null;
  hasAboutPage?: boolean;
  hasContactPage?: boolean;
}

const REPUTATION_VALUES: Record<Exclude<ReputationRating, 'unknown'>, number> = {
  reliable: 1,
  mixed: 0.5,
  unreliable: 0,
  satire: 0.2,
};

export function sourceSignals(input: SourceInput): Signal[] {
  const signals: Signal[] = [];
  const url = new URL(input.url);

  signals.push(
    url.protocol === 'https:'
      ? signal('source.https', 1, 'signal.source.https.yes')
      : signal('source.https', 0, 'signal.source.https.no'),
  );

  const rep = input.reputation;
  if (rep && rep.rating !== 'unknown') {
    signals.push(
      signal(
        'source.reputation',
        REPUTATION_VALUES[rep.rating],
        `signal.source.reputation.${rep.rating}`,
        { source: rep.source },
        rep.notes ? [rep.notes] : undefined,
      ),
    );
  }

  if (input.domainAgeDays != null) {
    const days = input.domainAgeDays;
    const value = days < 30 ? 0.1 : days < 180 ? 0.3 : days < 365 ? 0.6 : days < 3 * 365 ? 0.8 : 1;
    const [unit, n] = ageUnit(days);
    signals.push(signal('source.domainAge', value, `signal.source.domainAge.${unit}`, { n }));
  }

  if (input.hasAboutPage != null || input.hasContactPage != null) {
    const about = !!input.hasAboutPage;
    const contact = !!input.hasContactPage;
    const variant = about && contact ? 'both' : about ? 'about' : contact ? 'contact' : 'none';
    signals.push(
      signal(
        'source.transparency',
        (Number(about) + Number(contact)) / 2,
        `signal.source.transparency.${variant}`,
      ),
    );
  }

  return signals;
}

function ageUnit(days: number): ['days' | 'months' | 'years', number] {
  if (days < 60) return ['days', days];
  if (days < 730) return ['months', Math.round(days / 30)];
  return ['years', Math.floor(days / 365)];
}
