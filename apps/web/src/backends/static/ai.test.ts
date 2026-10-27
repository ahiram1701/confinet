import type { LlmAnalysis } from '@confinet/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runAi } from './ai';

vi.mock('./puter', () => ({ isPuterSignedIn: async () => false }));

const goodAi: LlmAnalysis = {
  tone: 'neutral',
  fallacies: [],
  claims: [],
  summary: 'Resumen',
  assessment: 70,
  reasoning: 'Cita fuentes.',
};

const settings = { provider: 'ollama-cloud', model: 'gpt-oss:120b', ollamaKey: 'k' } as const;
const article = { url: 'https://example.org/a', title: 'Titular', text: 'Texto' };

/** Simula /api/chat con una respuesta distinta en cada llamada. */
function mockOllama(...replies: object[]) {
  const fetchMock = vi.fn(
    async () => new Response(JSON.stringify(replies.shift() ?? {}), { status: 200 }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const body = (fetchMock: ReturnType<typeof mockOllama>, call: number) =>
  JSON.parse(String((fetchMock.mock.calls[call] as unknown as [string, RequestInit])[1].body));

beforeEach(() => vi.unstubAllGlobals());

describe('Ollama Cloud', () => {
  it('usa el JSON del campo thinking si content llega vacío', async () => {
    const fetchMock = mockOllama({
      message: { content: '', thinking: `Analizo… ${JSON.stringify(goodAi)}` },
    });
    await expect(runAi(settings, article)).resolves.toMatchObject({ assessment: 70 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(body(fetchMock, 0).format).toBeDefined();
  });

  it('si el modelo ignora el schema, reintenta pidiendo el JSON en el prompt', async () => {
    const fetchMock = mockOllama(
      { message: { content: 'Este artículo parece fiable.' } },
      { message: { content: '```json\n' + JSON.stringify(goodAi) + '\n```' } },
    );
    await expect(runAi(settings, article)).resolves.toMatchObject({ assessment: 70 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const retry = body(fetchMock, 1);
    expect(retry.format).toBeUndefined();
    expect(retry.messages[0].content).toContain('JSON Schema');
  });

  it('explica el fallo con un error legible', async () => {
    mockOllama({ message: { content: '' } }, { message: { content: '' }, done_reason: 'length' });
    await expect(runAi(settings, article)).rejects.toThrow(/se cortó/);
  });
});
