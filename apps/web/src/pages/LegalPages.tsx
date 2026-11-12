/*
 * Borradores de política de privacidad y términos. Las tiendas de extensiones exigen una
 * política de privacidad pública. Revisa y adapta estos textos antes de publicar.
 *
 * Al ser texto corrido, cada idioma tiene su versión completa en lugar de claves sueltas:
 * si cambias una, cambia también la otra.
 */

import { useI18n } from '@confinet/i18n/react';
import { MODE } from '../api';

export function PrivacyPage() {
  const { locale } = useI18n();
  return locale === 'es' ? <PrivacyEs /> : <PrivacyEn />;
}

export function TermsPage() {
  const { locale } = useI18n();
  return locale === 'es' ? <TermsEs /> : <TermsEn />;
}

function PrivacyEs() {
  return (
    <article className="cf-card prose">
      <h1>Política de privacidad</h1>
      <p className="cf-muted">Última actualización: noviembre de 2026.</p>

      <h2>Qué hace Confinet</h2>
      <p>
        Confinet analiza páginas web para estimar la fiabilidad de su contenido. Solo analiza una
        página cuando tú lo pides (o, si lo activas, en sitios de noticias de forma automática).
      </p>

      {MODE === 'static' && (
        <>
          <h2>Esta versión no tiene servidor</h2>
          <ul>
            <li>
              El análisis se hace <strong>en tu navegador</strong>. Tu historial y tus ajustes se
              guardan solo en él (almacenamiento local) y no se envían a Confinet.
            </li>
            <li>
              Si analizas un enlace pegado, la página se descarga a través de <strong>Puter</strong>{' '}
              con tu cuenta (su política de privacidad aplica a esa descarga). Con la extensión, la
              página se lee directamente.
            </li>
            <li>
              Si activas la IA, el texto del artículo se envía <strong>solo</strong> al proveedor
              que elijas (Puter u Ollama Cloud), con tu cuenta o tu API key. Tu key de Ollama se
              guarda únicamente en este navegador.
            </li>
            <li>
              Si activas las verificaciones externas, las afirmaciones del artículo (o su titular)
              se envían a <strong>Google Fact Check Tools</strong> con tu propia API key, que se
              guarda únicamente en este navegador.
            </li>
            <li>La antigüedad del dominio se consulta en el servicio público rdap.org.</li>
          </ul>
          <p>Lo siguiente aplica solo a la versión con servidor propio.</p>
        </>
      )}

      <h2>Qué datos tratamos</h2>
      <ul>
        <li>
          <strong>La página analizada</strong>: URL, título y texto del artículo se envían a nuestro
          servidor para calcular la puntuación. Guardamos la URL, el título, la puntuación y el
          resumen generado; <strong>no guardamos el texto completo</strong> del artículo.
        </li>
        <li>
          <strong>Proveedores de IA</strong>: el texto del artículo puede enviarse a un proveedor de
          modelos de lenguaje (por ejemplo Google Gemini, Groq o Cloudflare Workers AI) para su
          análisis. Algunos niveles gratuitos de estos proveedores pueden usar los datos para
          mejorar sus servicios. Si configuras tu propia clave, se usará tu proveedor.
        </li>
        <li>
          <strong>Cuenta</strong> (opcional): nombre y email de tu proveedor de inicio de sesión
          (Google o GitHub) y tu historial de análisis.
        </li>
        <li>
          <strong>Cuotas</strong>: para limitar el uso anónimo guardamos un identificador derivado
          de tu IP mediante una función hash; no almacenamos tu IP en claro.
        </li>
        <li>
          <strong>Claves de IA propias</strong>: se guardan cifradas (AES-256-GCM) y nunca se
          muestran.
        </li>
      </ul>

      <h2>Lo que no hacemos</h2>
      <ul>
        <li>No vendemos datos ni mostramos publicidad.</li>
        <li>
          No registramos tu historial de navegación: la extensión no envía nada sin un análisis.
        </li>
        <li>No usamos cookies de terceros ni rastreadores.</li>
      </ul>

      <h2>Tus derechos</h2>
      <p>
        Puedes borrar tu historial en cualquier momento desde la app y desconectar la extensión
        desde «Cuenta». Para eliminar tu cuenta y todos sus datos, escríbenos a través del
        repositorio del proyecto.
      </p>
    </article>
  );
}

function PrivacyEn() {
  return (
    <article className="cf-card prose">
      <h1>Privacy policy</h1>
      <p className="cf-muted">Last updated: November 2026.</p>

      <h2>What Confinet does</h2>
      <p>
        Confinet analyzes web pages to estimate how reliable their content is. It only analyzes a
        page when you ask it to (or, if you turn it on, automatically on news sites).
      </p>

      {MODE === 'static' && (
        <>
          <h2>This version has no server</h2>
          <ul>
            <li>
              The analysis happens <strong>in your browser</strong>. Your history and settings are
              stored only there (local storage) and are not sent to Confinet.
            </li>
            <li>
              If you analyze a pasted link, the page is downloaded through <strong>Puter</strong>{' '}
              with your account (its privacy policy applies to that download). With the extension,
              the page is read directly.
            </li>
            <li>
              If you turn on AI, the article text is sent <strong>only</strong> to the provider you
              choose (Puter or Ollama Cloud), with your account or your API key. Your Ollama key is
              stored only in this browser.
            </li>
            <li>
              If you turn on external fact-checks, the article's claims (or its headline) are sent
              to <strong>Google Fact Check Tools</strong> with your own API key, which is stored
              only in this browser.
            </li>
            <li>The domain age is looked up on the public rdap.org service.</li>
          </ul>
          <p>The following applies only to the self-hosted version with a server.</p>
        </>
      )}

      <h2>What data we process</h2>
      <ul>
        <li>
          <strong>The analyzed page</strong>: the article URL, title and text are sent to our server
          to compute the score. We store the URL, the title, the score and the generated summary;{' '}
          <strong>we do not store the full text</strong> of the article.
        </li>
        <li>
          <strong>AI providers</strong>: the article text may be sent to a language model provider
          (for example Google Gemini, Groq or Cloudflare Workers AI) for analysis. Some free tiers
          of these providers may use the data to improve their services. If you set up your own key,
          your provider is used.
        </li>
        <li>
          <strong>Account</strong> (optional): name and email from your sign-in provider (Google or
          GitHub) and your analysis history.
        </li>
        <li>
          <strong>Quotas</strong>: to limit anonymous usage we store an identifier derived from your
          IP with a hash function; we do not store your IP in plain text.
        </li>
        <li>
          <strong>Your own AI keys</strong>: they are stored encrypted (AES-256-GCM) and never
          shown.
        </li>
      </ul>

      <h2>What we don't do</h2>
      <ul>
        <li>We don't sell data or show ads.</li>
        <li>
          We don't record your browsing history: the extension sends nothing without an analysis.
        </li>
        <li>We don't use third-party cookies or trackers.</li>
      </ul>

      <h2>Your rights</h2>
      <p>
        You can delete your history at any time from the app and disconnect the extension from
        "Account". To delete your account and all its data, contact us through the project
        repository.
      </p>
    </article>
  );
}

function TermsEs() {
  return (
    <article className="cf-card prose">
      <h1>Términos de uso</h1>
      <p>
        Confinet ofrece una <strong>estimación automática y orientativa</strong> de la fiabilidad de
        un contenido. No es una verificación de hechos ni una valoración definitiva de ningún medio
        o persona. Las puntuaciones pueden contener errores: contrasta siempre la información.
      </p>
      <p>
        El servicio se ofrece gratuitamente, «tal cual», sin garantías, y con límites de uso
        diarios. No lo uses para automatizar peticiones masivas.
      </p>
      <p>
        Si crees que una puntuación es incorrecta, usa el botón «¿La puntuación no te parece
        correcta?» en el resultado: revisamos los avisos.
      </p>
    </article>
  );
}

function TermsEn() {
  return (
    <article className="cf-card prose">
      <h1>Terms of use</h1>
      <p>
        Confinet offers an <strong>automatic, indicative estimate</strong> of how reliable a piece
        of content is. It is not a fact-check or a final judgment on any outlet or person. Scores
        may contain errors: always check the information against other sources.
      </p>
      <p>
        The service is offered free of charge, "as is", without warranties, and with daily usage
        limits. Do not use it to automate bulk requests.
      </p>
      <p>
        If you think a score is wrong, use the "Doesn't the score look right?" button on the result:
        we review the reports.
      </p>
    </article>
  );
}
