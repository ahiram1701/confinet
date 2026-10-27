import { extractWithRewriter } from '@confinet/extract/rewriter';
import type { ExtractedPage } from '@confinet/core';
import { HttpError } from '../lib/errors';

const MAX_BYTES = 3 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 8_000;

/**
 * Valida que una URL apunte a internet público. Protección SSRF: impide usar el servidor
 * para acceder a localhost, redes privadas, metadatos de la nube o puertos no web.
 */
export function assertPublicUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new HttpError(400, 'invalid_url', 'URL no válida');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new HttpError(400, 'invalid_url', 'Solo se admiten URLs http(s)');
  }
  if (url.username || url.password) {
    throw new HttpError(400, 'invalid_url', 'La URL no puede incluir credenciales');
  }
  if (url.port && url.port !== '80' && url.port !== '443') {
    throw new HttpError(400, 'blocked_url', 'Puerto no permitido');
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.home.arpa') ||
    !host.includes('.') ||
    isPrivateIp(host)
  ) {
    throw new HttpError(400, 'blocked_url', 'Dirección no permitida');
  }
  return url;
}

export function isPrivateIp(host: string): boolean {
  // IPv4 (incluye formas abreviadas como 127.1 o enteros que algunos clientes aceptan)
  if (/^\d+$/.test(host) || /^0x[0-9a-f]+$/i.test(host)) return true;
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (/^\d+\.\d+(\.\d+)?$/.test(host)) return true; // IPv4 abreviada
  if (host.includes(':')) {
    // IPv6: loopback, link-local, ULA, IPv4 mapeada
    return (
      host === '::' ||
      host === '::1' ||
      /^fe[89ab]/i.test(host) ||
      /^f[cd]/i.test(host) ||
      /^::ffff:/i.test(host)
    );
  }
  return false;
}

/** Descarga una página pública y la extrae con HTMLRewriter (poca CPU). */
export async function fetchAndExtract(rawUrl: string): Promise<ExtractedPage> {
  let url = assertPublicUrl(rawUrl);
  let res: Response | undefined;

  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    res = await fetch(url.toString(), {
      redirect: 'manual',
      headers: {
        'user-agent': 'ConfinetBot/0.1 (+https://confinet.pages.dev/bot)',
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'es,en;q=0.8',
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      // Cada redirección se vuelve a validar: evita saltar a una IP interna.
      url = assertPublicUrl(new URL(location, url).toString());
      continue;
    }
    break;
  }

  if (!res || res.status >= 300) {
    throw new HttpError(
      502,
      'fetch_failed',
      `No se pudo descargar la página (HTTP ${res?.status ?? '?'})`,
    );
  }
  const type = res.headers.get('content-type') ?? '';
  if (!/text\/html|application\/xhtml/.test(type)) {
    throw new HttpError(415, 'not_html', 'La URL no es una página HTML');
  }
  const length = Number(res.headers.get('content-length') ?? 0);
  if (length > MAX_BYTES) throw new HttpError(413, 'too_large', 'La página es demasiado grande');

  return extractWithRewriter(limitBody(res, MAX_BYTES), url.toString());
}

/** Corta el cuerpo al llegar al límite aunque el servidor no envíe content-length. */
function limitBody(res: Response, maxBytes: number): Response {
  if (!res.body) return res;
  let received = 0;
  const limited = res.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        received += chunk.byteLength;
        if (received > maxBytes) {
          controller.terminate();
          return;
        }
        controller.enqueue(chunk);
      },
    }),
  );
  return new Response(limited, { headers: res.headers, status: res.status });
}
