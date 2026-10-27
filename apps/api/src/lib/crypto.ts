/** Utilidades criptográficas con Web Crypto (disponible en Workers sin dependencias). */

const enc = new TextEncoder();

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomToken(prefix: string, bytes = 32): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return `${prefix}_${toBase64Url(buf)}`;
}

function toBase64Url(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

const toB64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function importKey(base64Key: string): Promise<CryptoKey> {
  const raw = fromB64(base64Key);
  if (raw.byteLength !== 32) throw new Error('ENCRYPTION_KEY debe ser de 32 bytes en base64');
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

/** Cifra con AES-256-GCM. Devuelve texto cifrado e IV en base64. */
export async function encryptSecret(plain: string, base64Key: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await importKey(base64Key);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plain));
  return { ciphertext: toB64(ciphertext), iv: toB64(iv) };
}

export async function decryptSecret(ciphertext: string, iv: string, base64Key: string) {
  const key = await importKey(base64Key);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(iv) },
    key,
    fromB64(ciphertext),
  );
  return new TextDecoder().decode(plain);
}
