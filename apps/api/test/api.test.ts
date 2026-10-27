import type { AnalyzeResponse, ExtractedPage } from '@confinet/core';
import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../src/index';
import { isPrivateIp } from '../src/services/fetch-page';

const words = (n: number) => Array.from({ length: n }, (_, i) => `palabra${i}`).join(' ');

function page(url: string, overrides: Partial<ExtractedPage> = {}): ExtractedPage {
  return {
    url,
    title: 'La OMS publica nuevos datos de vacunación',
    author: 'Ana García',
    publishedAt: '2026-09-01',
    text: words(500),
    wordCount: 500,
    links: ['https://www.who.int/data', 'https://www.ine.es/x', 'https://www.nature.com/y'],
    adCount: 0,
    hasAboutPage: true,
    hasContactPage: true,
    ...overrides,
  };
}

async function call(path: string, init: RequestInit & { ip?: string } = {}) {
  const headers = new Headers(init.headers);
  headers.set('cf-connecting-ip', init.ip ?? '203.0.113.1');
  if (init.body) headers.set('content-type', 'application/json');
  const ctx = createExecutionContext();
  const res = await app.fetch(
    new Request(`http://localhost${path}`, { ...init, headers }),
    env,
    ctx,
  );
  await waitOnExecutionContext(ctx);
  return res;
}

const analyze = (body: unknown, init: RequestInit & { ip?: string } = {}) =>
  call('/api/v1/analyze', { method: 'POST', body: JSON.stringify(body), ...init });

// Sin red real en los tests: RDAP y Fact Check devuelven vacío.
beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}', { status: 404 }));
});
afterEach(() => vi.restoreAllMocks());

describe('API', () => {
  it('responde al health check', async () => {
    const res = await call('/api/health');
    expect(await res.json()).toEqual({ ok: true });
  });

  it('analiza una página enviada por la extensión y la cachea', async () => {
    const url = 'https://www.reuters.com/world/test-1';
    const first = await analyze({ url, extracted: page(url) }, { ip: '203.0.113.10' });
    expect(first.status).toBe(200);
    const a = (await first.json()) as AnalyzeResponse;
    expect(a.cached).toBe(false);
    expect(a.domain).toBe('reuters.com');
    expect(a.trust.level).toBe('high');
    expect(a.ai?.provider).toBe('mock');
    expect(a.trust.pillars.source.signals.some((s) => s.id === 'source.reputation')).toBe(true);

    const second = (await (
      await analyze({ url: `${url}?utm_source=x`, extracted: page(url) }, { ip: '203.0.113.10' })
    ).json()) as AnalyzeResponse;
    expect(second.cached).toBe(true);
    expect(second.id).toBe(a.id);
  });

  it('marca la sátira y limita la IA según la cuota anónima', async () => {
    const ip = '203.0.113.20';
    const results: AnalyzeResponse[] = [];
    for (let i = 0; i < 3; i++) {
      const url = `https://www.elmundotoday.com/n-${i}`;
      results.push(
        (await (await analyze({ url, extracted: page(url) }, { ip })).json()) as AnalyzeResponse,
      );
    }
    expect(
      results[0]?.trust.pillars.source.signals.find((s) => s.id === 'source.reputation')?.value,
    ).toBe(0.2);
    // AI_DAILY_ANON = 2 → el tercero ya no usa IA
    expect(results.map((r) => !!r.ai)).toEqual([true, true, false]);
    expect(results[2]?.aiUnavailableReason).toMatch(/agotado/);
  });

  it('devuelve 429 al superar el límite diario de análisis', async () => {
    const ip = '203.0.113.30';
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const url = `https://example.org/q-${i}`;
      statuses.push((await analyze({ url, extracted: page(url), skipAi: true }, { ip })).status);
    }
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
  });

  it.each([
    'http://127.0.0.1/',
    'http://localhost:8787/',
    'http://169.254.169.254/latest',
    'ftp://example.com/',
  ])('bloquea URLs internas o no web (%s)', async (url) => {
    const res = await analyze({ url }, { ip: '203.0.113.40' });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it('valida el cuerpo de la petición', async () => {
    const res = await analyze({ url: 'no-es-una-url' });
    expect(res.status).toBe(422);
  });

  it('detecta IPs privadas', () => {
    expect(
      ['10.0.0.1', '192.168.1.1', '172.20.0.1', '127.1', '2130706433', '::1', 'fd00::1'].every(
        isPrivateIp,
      ),
    ).toBe(true);
    expect(isPrivateIp('8.8.8.8')).toBe(false);
  });
});

describe('cuentas, historial y extensión', () => {
  async function signUp(email: string) {
    const res = await call('/api/auth/sign-up/email', {
      method: 'POST',
      body: JSON.stringify({ email, password: 'una-contraseña-larga-123', name: 'Prueba' }),
      headers: { origin: 'http://localhost:5173' },
    });
    expect(res.status).toBe(200);
    const cookie = res.headers
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .join('; ');
    expect(cookie).toContain('session_token');
    return cookie;
  }

  it('registra al usuario, guarda historial y emite un token para la extensión', async () => {
    const cookie = await signUp('ana@confinet.test');

    const me = (await (await call('/api/v1/me', { headers: { cookie } })).json()) as {
      user: { email: string; isAdmin: boolean };
    };
    expect(me.user.email).toBe('ana@confinet.test');
    expect(me.user.isAdmin).toBe(false);

    const tokenRes = await call('/api/v1/extension/token', {
      method: 'POST',
      body: JSON.stringify({ label: 'Chrome' }),
      headers: { cookie },
    });
    const { token } = (await tokenRes.json()) as { token: string };
    expect(token).toMatch(/^cnf_/);

    const bearer = { authorization: `Bearer ${token}` };
    const url = 'https://www.bbc.com/news/test';
    expect((await analyze({ url, extracted: page(url) }, { headers: bearer })).status).toBe(200);

    const history = (await (await call('/api/v1/history', { headers: bearer })).json()) as {
      items: { url: string }[];
    };
    expect(history.items.map((i) => i.url)).toEqual(['https://bbc.com/news/test']);

    // Un token no puede generar más tokens.
    const nested = await call('/api/v1/extension/token', {
      method: 'POST',
      body: '{}',
      headers: bearer,
    });
    expect(nested.status).toBe(403);
  });

  it('guarda la clave BYOK cifrada y nunca la devuelve', async () => {
    const cookie = await signUp('byok@confinet.test');
    const res = await call('/api/v1/settings/llm', {
      method: 'PUT',
      headers: { cookie },
      body: JSON.stringify({
        provider: 'anthropic',
        model: 'claude-sonnet-5-5',
        apiKey: 'sk-secreta',
      }),
    });
    const body = await res.json();
    expect(body).toEqual({
      provider: 'anthropic',
      model: 'claude-sonnet-5-5',
      baseUrl: null,
      hasKey: true,
    });
    expect(JSON.stringify(body)).not.toContain('sk-secreta');

    const row = await env.DB.prepare('select key_ciphertext from user_llm_key').first<{
      key_ciphertext: string;
    }>();
    expect(row?.key_ciphertext).not.toContain('sk-secreta');
  });

  it('protege las rutas de administración', async () => {
    const userCookie = await signUp('user2@confinet.test');
    expect(
      (await call('/api/v1/admin/reputation', { headers: { cookie: userCookie } })).status,
    ).toBe(403);

    const adminCookie = await signUp('admin@confinet.test');
    const put = await call('/api/v1/admin/reputation/ejemplo.com', {
      method: 'PUT',
      headers: { cookie: adminCookie },
      body: JSON.stringify({ rating: 'mixed', source: 'Revisión manual' }),
    });
    expect(put.status).toBe(200);
  });
});
