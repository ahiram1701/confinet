import type { Puter } from '@heyputer/puter.js';

/**
 * puter.js se carga bajo demanda: solo quien usa Puter (para descargar páginas o como IA)
 * descarga la librería. Puter funciona con el modelo «paga el usuario»: cada persona usa
 * su propia cuenta, sin coste para quien publica Confinet.
 */
let loading: Promise<Puter> | null = null;

export function loadPuter(): Promise<Puter> {
  loading ??= import('@heyputer/puter.js').then((m) => m.puter);
  return loading;
}

export async function isPuterSignedIn(): Promise<boolean> {
  try {
    return (await loadPuter()).auth.isSignedIn();
  } catch {
    return false;
  }
}

/** Abre la ventana de login de Puter. Debe llamarse desde un clic del usuario. */
export async function signInPuter(): Promise<void> {
  const puter = await loadPuter();
  await puter.auth.signIn();
}

export async function signOutPuter(): Promise<void> {
  (await loadPuter()).auth.signOut();
}

/** Descarga sin restricciones de CORS a través de Puter (requiere sesión iniciada). */
export async function puterFetch(url: string, init?: RequestInit): Promise<Response> {
  const puter = await loadPuter();
  if (!puter.auth.isSignedIn()) throw new NeedsPuterError();
  return puter.net.fetch(url, init);
}

export class NeedsPuterError extends Error {
  constructor() {
    super(
      'Para analizar un enlace pegado aquí, inicia sesión en Puter (gratis) en «Cuenta», o usa la extensión de Confinet en la propia página.',
    );
    this.name = 'NeedsPuterError';
  }
}
