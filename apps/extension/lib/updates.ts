import { browser } from 'wxt/browser';

const LATEST_RELEASE = 'https://api.github.com/repos/ahiram1701/confinet/releases/latest';
const KEY = 'update';

export interface UpdateInfo {
  /** Versión publicada más reciente (sin el prefijo ext-v). */
  latest: string;
  /** Página del Release, con el .zip para descargar. */
  url: string;
  checkedAt: number;
}

/** Compara versiones x.y.z: >0 si a es más nueva que b. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Las tiendas (Edge Add-ons, Chrome Web Store) añaden `update_url` al manifest y actualizan la
 * extensión solas. Solo la instalación descomprimida desde GitHub necesita el aviso.
 */
export function isStoreInstall(manifest = browser.runtime.getManifest()): boolean {
  return 'update_url' in manifest;
}

/** Consulta el último Release de GitHub y guarda el resultado. No lanza errores. */
export async function checkForUpdate(
  manifest = browser.runtime.getManifest(),
): Promise<UpdateInfo | null> {
  if (isStoreInstall(manifest)) return null;
  try {
    const res = await fetch(LATEST_RELEASE, {
      headers: { accept: 'application/vnd.github+json' },
    });
    if (!res.ok) return null;
    const release = (await res.json()) as { tag_name?: string; html_url?: string };
    const latest = release.tag_name?.replace(/^ext-v/, '');
    if (!latest || !release.html_url) return null;
    const info: UpdateInfo = { latest, url: release.html_url, checkedAt: Date.now() };
    await browser.storage.local.set({ [KEY]: info });
    return info;
  } catch {
    return null; // sin red o límite de la API: se reintenta en la próxima comprobación
  }
}

/** Versión nueva disponible para esta instalación, o null si está al día. */
export async function getAvailableUpdate(
  manifest = browser.runtime.getManifest(),
): Promise<UpdateInfo | null> {
  if (isStoreInstall(manifest)) return null;
  const info = (await browser.storage.local.get(KEY))[KEY] as UpdateInfo | undefined;
  return info && compareVersions(info.latest, manifest.version) > 0 ? info : null;
}
