# Pasos que tiene que hacer el propietario

Todo lo automatizable ya está hecho: el repositorio, la CI/CD, la web en GitHub Pages y el
Release de la extensión. Lo que queda **requiere tus cuentas**: crear cuentas, iniciar sesión o
pegar claves no se puede (ni se debe) automatizar desde fuera.

| Paso                                                                                             | Coste           | ¿Obligatorio? |
| ------------------------------------------------------------------------------------------------ | --------------- | ------------- |
| [1. Probar la IA con Puter](#1-probar-la-ia-con-puter)                                           | 0 €             | Recomendado   |
| [2. Probar la IA con Ollama Cloud](#2-probar-la-ia-con-ollama-cloud)                             | Pago por token  | Opcional      |
| [3. Instalar tu extensión en Chrome](#3-instalar-tu-extensión-en-chrome)                         | 0 €             | Recomendado   |
| [4. Publicar en Edge Add-ons](#4-publicar-en-edge-add-ons)                                       | 0 €             | Opcional      |
| [5. Publicar en Chrome Web Store](#5-publicar-en-chrome-web-store)                               | 5 USD (una vez) | Opcional      |
| [6. Activar la versión con servidor (Cloudflare)](#6-activar-la-versión-con-servidor-cloudflare) | 0 €             | Opcional      |

---

## 1. Probar la IA con Puter

1. Abre <https://ahiram1701.github.io/confinet/cuenta>.
2. En **«Sesión de Puter»**, pulsa **«Iniciar sesión con Puter»**. Se abre una ventana: crea tu
   cuenta (o entra) en Puter. Si no aparece, permite las ventanas emergentes para
   `ahiram1701.github.io`.
3. En **«Proveedor de IA (opcional)»**, elige **Puter** → **«Cargar modelos disponibles»** →
   elige un modelo (por ejemplo, uno de Claude) → **«Guardar»**.
4. Ve a **Analizar**, pega un enlace de una noticia y pulsa **«Analizar»**. En el resultado debe
   aparecer el pilar **Análisis IA** con una nota y la tarjeta «Análisis IA» con el resumen.

Si algo falla, el resultado muestra el motivo debajo del desglose. Ábreme un issue con ese texto.

## 2. Probar la IA con Ollama Cloud

> Ollama Cloud **cobra por token** a tu cuenta y no incluye modelos de Claude.

1. Entra en <https://ollama.com>, crea tu cuenta y añade saldo o un plan en
   <https://ollama.com/pricing>.
2. Crea una API key en <https://ollama.com/settings/keys>.
3. En <https://ahiram1701.github.io/confinet/cuenta>, elige **Ollama Cloud**, pega la key en
   **«API key de Ollama»**, pulsa **«Cargar modelos disponibles»**, elige un modelo (por
   ejemplo, `gpt-oss:120b`) y **«Guardar»**. La key queda guardada aunque cambies de proveedor;
   para borrarla, pulsa **«Olvidar key»**.
4. Analiza una noticia como en el paso 1.

Si aparece «El navegador bloqueó la conexión directa con Ollama…», Ollama no admite llamadas
desde webs. Inicia sesión también en Puter (paso 1) para que la petición pase por su proxy.

## 3. Instalar tu extensión en Chrome

1. Descarga `confinet-extension-X.Y.Z-chrome.zip` (la última versión) desde
   <https://github.com/ahiram1701/confinet/releases/latest>.
2. Descomprímelo en una carpeta permanente (por ejemplo, `Documentos\Confinet`).
3. Abre `chrome://extensions`, activa **«Modo de desarrollador»** y pulsa **«Cargar
   descomprimida»** → elige la carpeta.
4. Fija el icono (🧩 → 📌), abre una noticia y pulsa el icono de Confinet.

Instalada así, la extensión **no se actualiza sola** (ningún navegador lo hace con las
extensiones descomprimidas), pero **te avisa** cuando hay versión nueva. Para que se actualice
sola, publícala en Edge Add-ons (paso 4, gratis) e instálala desde allí.

## 4. Publicar en Edge Add-ons

Registro gratuito. **Es la forma gratuita de que la extensión se actualice sola** en el navegador
de quien la instale. Sigue la guía paso a paso, con los textos para copiar y las imágenes ya
preparadas: **[publicar-edge.md](publicar-edge.md)**.

## 5. Publicar en Chrome Web Store

1. Regístrate en <https://chrome.google.com/webstore/devconsole> (pago único de 5 USD).
2. **«Añadir elemento nuevo»** → sube el `.zip` → rellena la ficha con los mismos textos de
   [publicar-edge.md](publicar-edge.md) (en Chrome el logo es `docs/tienda/logo-128.png`).
3. Para automatizarlo, sigue la guía de credenciales de
   [chrome-webstore-upload](https://github.com/fregante/chrome-webstore-upload-keys) y añade en el
   environment `production` los secretos `CWS_EXTENSION_ID`, `CWS_CLIENT_ID`,
   `CWS_CLIENT_SECRET` y `CWS_REFRESH_TOKEN`, más la variable `CWS_ENABLED` = `true`.

## 6. Activar la versión con servidor (Cloudflare)

Añade cuentas con Google o GitHub, historial sincronizado, verificaciones de Google Fact Check
y un panel de administración. Sigue [despliegue-cloudflare.md](despliegue-cloudflare.md).

---

### Publicar nuevas versiones de la extensión

No hay que hacer nada: cada cambio que afecta a la extensión y se fusiona en `main` publica una
versión nueva sola (último tag `ext-v*` + 1 en el parche, p. ej. 0.1.1 → 0.1.2). El workflow
«Publicar extensión» crea el tag y el Release con el `.zip` y, si lo activaste, publica en Edge y
Chrome.

Para un salto mayor (0.2.0, 1.0.0), sube la versión en `apps/extension/package.json` (o usa
`pnpm changeset`): si es mayor que la del último tag, se usa esa.

La app web se despliega en GitHub Pages con cada push a `main` y se actualiza sola en los
navegadores de quien la usa.
