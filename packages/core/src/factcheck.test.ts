import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchFactChecks, testFactCheckKey } from './factcheck';

const claim = (text: string, verifiable = true) => ({ text, verifiable, sourced: false });

function mockFetch(status: number, body: unknown = {}) {
  const fn = vi.fn(async (_url: string) => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe('searchFactChecks', () => {
  it('sin key no consulta nada', async () => {
    const fetch = mockFetch(200);
    expect(await searchFactChecks(undefined, [claim('x')])).toEqual({
      matches: [],
      status: 'skipped',
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('convierte las revisiones en verificaciones con veredicto normalizado', async () => {
    mockFetch(200, {
      claims: [
        {
          text: 'La vacuna causa X',
          claimReview: [
            { publisher: { name: 'Maldita' }, url: 'https://maldita.es/a', textualRating: 'Falso' },
          ],
        },
      ],
    });
    const { matches, status } = await searchFactChecks('k', [claim('La vacuna causa X')], 'es');
    expect(status).toBe('ok');
    expect(matches).toEqual([
      {
        claim: 'La vacuna causa X',
        rating: 'Falso',
        verdict: 'false',
        publisher: 'Maldita',
        url: 'https://maldita.es/a',
      },
    ]);
  });

  it('sin afirmaciones verificables busca por el titular', async () => {
    const fetch = mockFetch(200, { claims: [] });
    await searchFactChecks('k', [claim('opinión', false)], undefined, {
      fallbackQuery: 'Titular de la noticia',
    });
    expect(String(fetch.mock.calls[0]?.[0])).toContain('query=Titular+de+la+noticia');
  });

  it('distingue una key rechazada', async () => {
    mockFetch(403);
    expect((await searchFactChecks('mala', [claim('x')])).status).toBe('rejected');
    expect(await testFactCheckKey('mala')).toBe('rejected');
  });
});
