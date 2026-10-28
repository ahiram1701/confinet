import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { checkForUpdate, compareVersions, getAvailableUpdate } from './updates';

const unpacked = { manifest_version: 3, name: 'Confinet', version: '0.1.0' } as const;
const fromStore = {
  ...unpacked,
  update_url: 'https://edge.microsoft.com/extensionwebstorebase/v1/crx',
};

function mockRelease(tag: string) {
  const fetchMock = vi.fn(
    async () =>
      new Response(
        JSON.stringify({ tag_name: tag, html_url: `https://github.com/x/releases/tag/${tag}` }),
      ),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  fakeBrowser.reset();
  vi.unstubAllGlobals();
});

describe('compareVersions', () => {
  it.each([
    ['0.1.1', '0.1.0', 1],
    ['0.2.0', '0.1.9', 1],
    ['0.10.0', '0.9.0', 1],
    ['0.1.0', '0.1.0', 0],
    ['0.1.0', '0.1.1', -1],
  ])('%s vs %s', (a, b, sign) => {
    expect(Math.sign(compareVersions(a, b))).toBe(sign);
  });
});

describe('aviso de versión nueva', () => {
  it('avisa si el último Release es más nuevo que la versión instalada', async () => {
    mockRelease('ext-v0.1.3');
    await checkForUpdate(unpacked);
    expect(await getAvailableUpdate(unpacked)).toMatchObject({ latest: '0.1.3' });
  });

  it('no avisa si ya está al día', async () => {
    mockRelease('ext-v0.1.0');
    await checkForUpdate(unpacked);
    expect(await getAvailableUpdate(unpacked)).toBeNull();
  });

  it('no consulta GitHub si la extensión viene de una tienda (se actualiza sola)', async () => {
    const fetchMock = mockRelease('ext-v9.0.0');
    expect(await checkForUpdate(fromStore)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sin red no falla', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('offline');
    });
    await expect(checkForUpdate(unpacked)).resolves.toBeNull();
  });
});
