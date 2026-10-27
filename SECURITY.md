# Política de seguridad

## Versiones soportadas

Solo la última versión publicada (rama `main`, la app en GitHub Pages y el último Release de la
extensión) recibe correcciones de seguridad.

## Informar de una vulnerabilidad

**No abras un issue público.** Usa el aviso privado de GitHub:
[Report a vulnerability](https://github.com/ahiram1701/confinet/security/advisories/new).

Incluye una descripción, los pasos para reproducirla y su posible impacto. Intentaremos responder
en un plazo de 7 días y te mantendremos informado hasta su corrección. Agradeceremos
públicamente tu ayuda si así lo deseas.

## Alcance

Nos interesan especialmente:

- Fugas de las claves de IA de los usuarios (almacenamiento local o BYOK cifrado en el servidor).
- Inyección de código a través de páginas analizadas, del traspaso extensión→PWA o de las
  respuestas de los modelos.
- SSRF u otros abusos de la API en el modo con servidor.
- Permisos excesivos de la extensión.
