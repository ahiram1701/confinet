# Publicar Confinet en Microsoft Edge Add-ons

Guía paso a paso para la **primera publicación** (a mano, una sola vez) y para activar la
publicación automática de las siguientes versiones. Todo es **gratis**. Microsoft revisa cada
versión antes de publicarla (hasta 7 días hábiles).

Necesitas:

- Una **cuenta Microsoft** (Outlook/Hotmail sirve).
- El `.zip` de la última versión: descárgalo de
  [Releases](https://github.com/ahiram1701/confinet/releases/latest)
  (`confinet-extension-X.Y.Z-chrome.zip`). **No lo descomprimas.**
- Las imágenes de [`docs/tienda/`](tienda) (descarga la carpeta o clona el repo).

---

## Paso 1. Registrarte como desarrollador (una vez)

1. Entra en <https://partner.microsoft.com/dashboard/microsoftedge/public/login?ref=dd> con tu
   cuenta Microsoft.
2. Rellena el registro del programa **Microsoft Edge**:
   - **Tipo de cuenta**: **Individual** (para ti) — gratis.
   - **Nombre para mostrar del editor**: el que verán los usuarios, p. ej. `Alberto Hiram Saucedo
Guajardo` o `Confinet`.
   - Datos de contacto: tu nombre, correo y país.
3. Acepta el acuerdo y termina. Puede que Microsoft verifique tu correo.

## Paso 2. Crear la extensión y subir el paquete

1. En el panel, **Edge → Overview** → **«Create new extension»**.
2. Arrastra el `.zip` a **«Drag your package here»**. Espera a que se valide.
3. Pulsa **«Continue»**.

## Paso 3. Availability (disponibilidad)

- **Visibility**: **Public**.
- **Markets**: deja **todos** los mercados.
- **«Save & Continue»**.

## Paso 4. Properties (propiedades)

| Campo                  | Qué poner                                       |
| ---------------------- | ----------------------------------------------- |
| Category               | **Productivity** (o **News & weather**)         |
| Website                | `https://ahiram1701.github.io/confinet/`        |
| Support contact detail | `https://github.com/ahiram1701/confinet/issues` |
| Mature content         | Sin marcar                                      |

**«Save & Continue»**.

## Paso 5. Privacy (privacidad)

**Single Purpose Description** (copia y pega):

```text
Confinet muestra una puntuación orientativa de confianza (0-100) de la página de noticias o artículo que el usuario está leyendo, explicada señal a señal (autoría, fecha, fuentes enlazadas, tono, publicidad), para ayudarle a leer con espíritu crítico.
```

**Permission justification** (un texto por permiso):

| Permiso                                      | Justificación (copia y pega)                                                                                                                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `activeTab`                                  | Leer la página que el usuario tiene abierta únicamente cuando pulsa el icono de Confinet, para extraer el texto del artículo y puntuarlo en local.                                                |
| `scripting`                                  | Ejecutar en la pestaña activa el script que extrae el título, el autor, la fecha, el texto y los enlaces del artículo, solo tras la acción del usuario (o en el modo automático si él lo activa). |
| `storage`                                    | Guardar los ajustes del usuario y el resultado del análisis de cada pestaña mientras está abierta.                                                                                                |
| `alarms`                                     | Comprobar una vez al día si hay una versión nueva publicada, para avisar al usuario que instaló la extensión manualmente.                                                                         |
| Host `https://ahiram1701.github.io/*`        | Abrir la app web de Confinet con la página ya extraída para el análisis completo (fuente del dominio, reputación y, si el usuario lo activa, IA).                                                 |
| Hosts opcionales `https://*/*`, `http://*/*` | Solo se piden en tiempo de ejecución si el usuario activa en las opciones el «análisis automático», para mostrar la nota en el icono al abrir artículos. Se retiran si lo desactiva.              |

**Are you using remote code?** → **No, I am not using remote code.**

**Data usage**:

- En «What user data do you plan to collect», marca **Website content** (la extensión lee el
  texto de la página para puntuarlo). Nada más.
- Marca todas las casillas de **«I certify that the following disclosures are true»** (Confinet
  no vende datos ni los usa para nada ajeno a su función).

**Privacy Policy URL**: `https://ahiram1701.github.io/confinet/privacidad`

**«Save & Continue»**.

## Paso 6. Store listings (ficha de la tienda)

En la fila del idioma (Spanish / English, según lo que aparezca) pulsa **«Edit details»**:

**Description** (mínimo 250 caracteres; copia y pega):

```text
Confinet te ayuda a decidir cuánto puedes fiarte de lo que lees en internet.

Pulsa el icono en cualquier noticia o artículo y obtendrás una puntuación de confianza de 0 a 100, explicada señal a señal:

• Fuente: reputación del medio y antigüedad del dominio.
• Contenido: autor identificado, fecha de publicación, enlaces a fuentes, titular sensacionalista, mayúsculas y exclamaciones, cantidad de publicidad, páginas de «Quiénes somos» y «Contacto».
• Análisis con IA (opcional): tono, falacias y afirmaciones sin respaldo, con el proveedor que tú elijas (Puter u Ollama Cloud). Sin IA por defecto.

Privacidad: la página se analiza en tu navegador. Confinet no tiene servidor, no usa rastreadores ni cookies de terceros y no ve tus análisis. Tu historial se guarda solo en tu navegador.

Importante: Confinet es una ayuda orientativa para leer con espíritu crítico, no un verificador de hechos. No juzga opiniones ni ideologías: valora el método (fuentes, autoría, tono), no la postura.

Código abierto (MIT): https://github.com/ahiram1701/confinet
```

| Campo                  | Archivo de `docs/tienda/`                                       |
| ---------------------- | --------------------------------------------------------------- |
| Extension logo         | `logo-300.png`                                                  |
| Small promotional tile | `mosaico-440x280.png`                                           |
| Screenshots            | `captura-1-resultado.png` … `captura-4-cuenta.png` (1280 × 800) |

**Search terms** (máximo 7):

```text
noticias falsas
desinformación
fiabilidad
verificar noticias
fake news
confianza
pensamiento crítico
```

**«Save draft»**. La fila del idioma debe quedar en **Complete**.

## Paso 7. Enviar a revisión

1. Pulsa **«Publish»** (arriba a la derecha).
2. En **Notes for certification** (copia y pega):

```text
No se necesita cuenta ni credenciales.
Prueba: abre cualquier noticia (p. ej. https://www.bbc.com/news o https://elpais.com), pulsa el icono de Confinet y verás la puntuación rápida calculada en local. El botón «Análisis completo en Confinet» abre la app web (https://ahiram1701.github.io/confinet/) con la página ya extraída; el análisis con IA es opcional y desactivado por defecto.
La extensión solo lee la pestaña activa cuando el usuario pulsa el icono (activeTab). Los permisos de sitios opcionales solo se piden si el usuario activa el análisis automático en las opciones.
Código fuente: https://github.com/ahiram1701/confinet
```

3. **«Publish»**. Estado: **In certification**. Cuando la aprueben pasará a **In the Store** y
   tendrás el enlace público de la ficha.

> Si te la rechazan, el correo explica el motivo. Pásamelo y lo corregimos.

---

## Paso 8. Publicación automática de las siguientes versiones

Cuando la primera versión esté **In the Store**:

1. En Partner Center → **Microsoft Edge → Publish API**. Si ves el mensaje «enable the new
   experience», pulsa **«Enable»**. Después pulsa **«Create API credentials»** (tarda unos
   minutos).
2. Copia el **Client ID** y la **API key**. La página muestra la fecha de caducidad (**Expiry**)
   de la key: antes de esa fecha crea otra y actualiza el secreto `EDGE_API_KEY`.
3. Copia el **Product ID**: en **Microsoft Edge → Overview** → Confinet → **Extension
   overview**, sección **Extension identity** (también es el GUID de la URL).
4. En GitHub → repo **confinet** → **Settings → Environments → production** → **Add environment
   secret**, crea:
   - `EDGE_PRODUCT_ID`
   - `EDGE_CLIENT_ID`
   - `EDGE_API_KEY`
5. En **Settings → Secrets and variables → Actions → Variables → New repository variable**:
   `EDGE_ENABLED` = `true`.

Desde entonces, cada versión nueva de la extensión se envía sola a revisión en Edge y, cuando
Microsoft la aprueba, **el navegador de cada usuario la actualiza solo**.

> Si una versión sigue en revisión cuando sale la siguiente, Edge rechaza la segunda subida. No
> pasa nada: la siguiente versión la incluirá.

## Paso 9. Instalar desde la tienda

1. Abre el enlace de tu ficha en Edge y pulsa **«Obtener»**.
2. Si tenías la versión descomprimida, quítala en `edge://extensions` para no tener dos.

> Edge Add-ons solo sirve para Edge. En Chrome y Brave, las actualizaciones automáticas
> necesitan la Chrome Web Store (5 USD, ver
> [pasos-pendientes.md](pasos-pendientes.md#5-publicar-en-chrome-web-store)); mientras tanto,
> la versión descomprimida te avisa de cada versión nueva.
