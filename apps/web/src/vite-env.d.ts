/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "api" (Cloudflare, por defecto) o "static" (GitHub Pages, sin servidor). */
  readonly VITE_BACKEND?: 'api' | 'static';
}

declare module '*?raw' {
  const content: string;
  export default content;
}
