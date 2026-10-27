import { eq } from 'drizzle-orm';
import type { Db } from '../db';
import { domainInfo } from '../db/schema';

const RECHECK_MS = 30 * 24 * 3600 * 1000;
/** Si RDAP falló, reintentamos antes: puede ser un error transitorio. */
const RETRY_FAILED_MS = 24 * 3600 * 1000;

/**
 * Antigüedad del dominio en días vía RDAP (sustituto moderno y gratuito de WHOIS).
 * Se cachea 30 días en D1; si RDAP falla devolvemos null y la señal simplemente no se mide.
 */
export async function domainAgeDays(db: Db, domain: string): Promise<number | null> {
  const cached = await db.select().from(domainInfo).where(eq(domainInfo.domain, domain)).get();
  if (
    cached &&
    Date.now() - cached.checkedAt.getTime() < (cached.registeredAt ? RECHECK_MS : RETRY_FAILED_MS)
  ) {
    return cached.registeredAt ? ageInDays(cached.registeredAt) : null;
  }

  const registeredAt = await lookupRegistration(domain);
  await db
    .insert(domainInfo)
    .values({ domain, registeredAt, checkedAt: new Date() })
    .onConflictDoUpdate({
      target: domainInfo.domain,
      set: { registeredAt, checkedAt: new Date() },
    });

  return registeredAt ? ageInDays(registeredAt) : null;
}

async function lookupRegistration(domain: string): Promise<Date | null> {
  try {
    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      // Algunos registros RDAP rechazan (403) las peticiones sin User-Agent.
      headers: {
        accept: 'application/rdap+json',
        'user-agent': 'ConfinetBot/0.1 (+https://confinet.pages.dev/bot)',
      },
      signal: AbortSignal.timeout(4_000),
    });
    if (!res.ok) {
      console.warn(`RDAP ${domain}: HTTP ${res.status}`);
      return null;
    }
    const data = (await res.json()) as { events?: { eventAction?: string; eventDate?: string }[] };
    const event = data.events?.find((e) => e.eventAction === 'registration');
    const date = event?.eventDate ? new Date(event.eventDate) : null;
    return date && !Number.isNaN(date.getTime()) ? date : null;
  } catch (error) {
    console.warn(`RDAP ${domain}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

const ageInDays = (date: Date) =>
  Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
