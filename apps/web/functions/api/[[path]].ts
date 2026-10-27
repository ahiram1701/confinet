/**
 * Cloudflare Pages Function: reenvía /api/* al Worker de la API mediante un "service binding".
 * Así la PWA y la API comparten origen (cookies de primera parte, sin CORS) y sin coste extra.
 */
interface Env {
  API: Fetcher;
}

export const onRequest: PagesFunction<Env> = ({ request, env }) => env.API.fetch(request);
