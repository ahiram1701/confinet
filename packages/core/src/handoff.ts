import { AnalyzeRequestSchema, type AnalyzeRequest } from './api-types';

/**
 * Traspaso de una página ya extraída (extensión → PWA) dentro del fragmento de la URL:
 *   https://…/analizar#data=<base64url(gzip(json))>
 * El fragmento (#…) nunca se envía a ningún servidor, ni siquiera a GitHub Pages.
 */

/** Recortamos el texto: suficiente para puntuar y para la IA, y la URL sigue siendo manejable. */
export const HANDOFF_MAX_TEXT = 30_000;

export async function encodeHandoff(req: AnalyzeRequest): Promise<string> {
  const trimmed: AnalyzeRequest = req.extracted
    ? {
        ...req,
        extracted: { ...req.extracted, text: req.extracted.text.slice(0, HANDOFF_MAX_TEXT) },
      }
    : req;
  const bytes = new TextEncoder().encode(JSON.stringify(trimmed));
  const gz = await streamBytes(
    new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip')),
  );
  return toBase64Url(gz);
}

export async function decodeHandoff(data: string): Promise<AnalyzeRequest> {
  const gz = fromBase64Url(data);
  const bytes = await streamBytes(
    new Blob([gz.buffer as ArrayBuffer]).stream().pipeThrough(new DecompressionStream('gzip')),
  );
  // Validamos: el contenido viene de una URL que cualquiera puede construir.
  return AnalyzeRequestSchema.parse(JSON.parse(new TextDecoder().decode(bytes)));
}

async function streamBytes(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
