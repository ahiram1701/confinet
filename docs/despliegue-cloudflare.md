# Despliegue con servidor (Cloudflare)

La versión publicada de Confinet funciona sin servidor en GitHub Pages. Esta guía activa la
versión **con servidor**, que añade cuentas con Google o GitHub, historial sincronizado entre la
extensión y la app, verificaciones de Google Fact Check, panel de administración y cualquier
proveedor de IA en el servidor. Todo con los planes gratuitos de Cloudflare.

## 1. Recursos de Cloudflare

1. Crea una cuenta gratuita en <https://dash.cloudflare.com>.
2. Crea un token de API con permisos de **Workers Scripts**, **D1** y **Pages** (edición).
3. Inicia sesión y prepara los recursos. El script crea las bases de datos D1 de staging y
   producción, escribe sus IDs en `apps/api/wrangler.toml` y crea el proyecto de Pages.

```bash
pnpm --filter @confinet/api exec wrangler login
```

```bash
bash scripts/setup-cloudflare.sh
```

4. Haz commit de `apps/api/wrangler.toml`.

## 2. Secretos en GitHub

En **Settings → Environments** crea `staging` y `production` con estos secretos:

| Secreto                                                 | Obligatorio | Descripción                                    |
| ------------------------------------------------------- | ----------- | ---------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`                                  | ✓           | Token del paso 1                               |
| `CLOUDFLARE_ACCOUNT_ID`                                 | ✓           | ID de tu cuenta de Cloudflare                  |
| `BETTER_AUTH_SECRET`                                    | ✓           | Cadena aleatoria larga                         |
| `ENCRYPTION_KEY`                                        | ✓           | 32 bytes en base64 (`openssl rand -base64 32`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`             |             | Login con Google                               |
| `OAUTH_GITHUB_CLIENT_ID` / `OAUTH_GITHUB_CLIENT_SECRET` |             | Login con GitHub                               |
| `LLM_API_KEY`, `GROQ_API_KEY`, `OLLAMA_API_KEY`…        |             | Claves de IA del servidor                      |
| `FACTCHECK_API_KEY`                                     |             | Google Fact Check Tools                        |
| `ADMIN_EMAILS`                                          |             | Emails con acceso al panel de administración   |

En `production`, activa **Required reviewers** para aprobar cada despliegue.

## 3. IA del servidor (opcional)

No hay proveedor ni modelo por defecto. Define en `apps/api/wrangler.toml` (o como variables del
Worker), por ejemplo:

```toml
LLM_PROVIDER = "ollama-cloud"
LLM_MODEL = "gpt-oss:120b"
LLM_FALLBACKS = "groq:llama-3.3-70b-versatile"
```

Cada respaldo debe indicar `proveedor:modelo`. Los usuarios también pueden configurar su propia
clave en **Cuenta**.

## 4. OAuth

URL de retorno: `https://<tu-dominio>/api/auth/callback/google` (o `/github`).

## 5. Activar el despliegue

Crea la variable de repositorio `CLOUDFLARE_ENABLED=true`
(**Settings → Secrets and variables → Actions → Variables**). A partir de entonces:

- push a `main` → staging (`https://main.confinet.pages.dev`);
- tag `vX.Y.Z` → producción (`https://confinet.pages.dev`).

Para que la extensión use la API, publícala con `WXT_BACKEND=api` y
`WXT_APP_URL=https://confinet.pages.dev` en `release-extension.yml`.
