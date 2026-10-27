/*
 * Borradores de política de privacidad y términos. Las tiendas de extensiones exigen una
 * política de privacidad pública. Revisa y adapta estos textos antes de publicar.
 */

import { MODE } from '../api';

export function PrivacyPage() {
  return (
    <article className="cf-card prose">
      <h1>Política de privacidad</h1>
      <p className="cf-muted">Última actualización: octubre de 2026.</p>

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

export function TermsPage() {
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
