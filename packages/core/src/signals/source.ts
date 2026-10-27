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

const REPUTATION_VALUES: Record<Exclude<ReputationRating, 'unknown'>, [number, string]> = {
  reliable: [1, 'Medio con buena reputación'],
  mixed: [0.5, 'Medio con reputación mixta'],
  unreliable: [0, 'Medio señalado como poco fiable'],
  satire: [0.2, 'Sitio de sátira o humor: no es información real'],
};

export function sourceSignals(input: SourceInput): Signal[] {
  const signals: Signal[] = [];
  const url = new URL(input.url);

  signals.push(
    url.protocol === 'https:'
      ? signal('source.https', 1, 'El sitio usa conexión cifrada (HTTPS).')
      : signal('source.https', 0, 'El sitio no usa conexión cifrada (HTTPS).'),
  );

  const rep = input.reputation;
  if (rep && rep.rating !== 'unknown') {
    const [value, label] = REPUTATION_VALUES[rep.rating];
    signals.push(
      signal(
        'source.reputation',
        value,
        `${label} según ${rep.source}.`,
        rep.notes ? [rep.notes] : undefined,
      ),
    );
  }

  if (input.domainAgeDays != null) {
    const days = input.domainAgeDays;
    const value = days < 30 ? 0.1 : days < 180 ? 0.3 : days < 365 ? 0.6 : days < 3 * 365 ? 0.8 : 1;
    signals.push(signal('source.domainAge', value, `Dominio registrado hace ${formatAge(days)}.`));
  }

  if (input.hasAboutPage != null || input.hasContactPage != null) {
    const found = [input.hasAboutPage && '"Quiénes somos"', input.hasContactPage && '"Contacto"']
      .filter(Boolean)
      .join(' y ');
    const count = Number(!!input.hasAboutPage) + Number(!!input.hasContactPage);
    signals.push(
      signal(
        'source.transparency',
        count / 2,
        found
          ? `El sitio enlaza a ${found}.`
          : 'No se encuentran páginas de "Quiénes somos" ni "Contacto".',
      ),
    );
  }

  return signals;
}

function formatAge(days: number): string {
  if (days < 60) return `${days} días`;
  if (days < 730) return `${Math.round(days / 30)} meses`;
  return `${Math.floor(days / 365)} años`;
}
