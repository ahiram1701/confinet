import { httpApi } from './backends/http';
import { staticApi } from './backends/static';

export * from './backends/http';

/**
 * Modo de despliegue, fijado al compilar con VITE_BACKEND:
 *  - "api": PWA + API en Cloudflare (cuentas, historial sincronizado, admin).
 *  - "static": solo la PWA en GitHub Pages; todo el análisis ocurre en el navegador.
 */
export const MODE: 'api' | 'static' = import.meta.env.VITE_BACKEND === 'static' ? 'static' : 'api';

export const api = MODE === 'static' ? staticApi : httpApi;

/** Repositorio público (para enlazar issues y documentación). */
export const REPO_URL = 'https://github.com/ahiram1701/confinet';
