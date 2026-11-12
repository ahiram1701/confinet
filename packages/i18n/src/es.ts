/**
 * Textos en español: el diccionario de referencia. Sus claves definen `MessageKey`, así que
 * cualquier otro idioma (en.ts) que no tenga todas las claves no compila.
 *
 * Un texto es una cadena con {parámetros} o, si depende de un número, { one, other } elegido
 * con el parámetro `n`.
 */
export type Message = string | { one: string; other: string };

export const es = {
  // Niveles y pilares
  'level.high': 'Confianza alta',
  'level.medium': 'Confianza media',
  'level.low': 'Confianza baja',
  'level.unknown': 'Sin datos suficientes',
  'pillar.source': 'Fuente',
  'pillar.content': 'Contenido',
  'pillar.ai': 'Análisis IA',

  // Señales: nombre y explicaciones
  'signal.source.https': 'Conexión segura (HTTPS)',
  'signal.source.https.yes': 'El sitio usa conexión cifrada (HTTPS).',
  'signal.source.https.no': 'El sitio no usa conexión cifrada (HTTPS).',
  'signal.source.reputation': 'Reputación del medio',
  'signal.source.reputation.reliable': 'Medio con buena reputación según {source}.',
  'signal.source.reputation.mixed': 'Medio con reputación mixta según {source}.',
  'signal.source.reputation.unreliable': 'Medio señalado como poco fiable según {source}.',
  'signal.source.reputation.satire':
    'Sitio de sátira o humor según {source}: no es información real.',
  'signal.source.domainAge': 'Antigüedad del dominio',
  'signal.source.domainAge.days': {
    one: 'Dominio registrado hace {n} día.',
    other: 'Dominio registrado hace {n} días.',
  },
  'signal.source.domainAge.months': 'Dominio registrado hace {n} meses.',
  'signal.source.domainAge.years': {
    one: 'Dominio registrado hace {n} año.',
    other: 'Dominio registrado hace {n} años.',
  },
  'signal.source.transparency': 'Transparencia del sitio',
  'signal.source.transparency.both': 'El sitio enlaza a "Quiénes somos" y "Contacto".',
  'signal.source.transparency.about': 'El sitio enlaza a "Quiénes somos".',
  'signal.source.transparency.contact': 'El sitio enlaza a "Contacto".',
  'signal.source.transparency.none': 'No se encuentran páginas de "Quiénes somos" ni "Contacto".',

  'signal.content.author': 'Autor identificado',
  'signal.content.author.yes': 'El artículo está firmado por "{author}".',
  'signal.content.author.no': 'No se identifica a ningún autor.',
  'signal.content.date': 'Fecha de publicación',
  'signal.content.date.yes': 'Fecha de publicación visible: {date}.',
  'signal.content.date.no': 'No se indica cuándo se publicó.',
  'signal.content.citations': 'Enlaces a fuentes',
  'signal.content.citations.none': 'No enlaza a ninguna fuente externa.',
  'signal.content.citations.some': {
    one: 'Enlaza a {n} fuente externa.',
    other: 'Enlaza a {n} fuentes externas.',
  },
  'signal.content.clickbait': 'Titular sensacionalista',
  'signal.content.clickbait.no': 'El titular no usa fórmulas sensacionalistas.',
  'signal.content.clickbait.yes': 'El titular usa fórmulas típicas de "clickbait".',
  'signal.content.shouting': 'Mayúsculas y exclamaciones',
  'signal.content.shouting.ok': 'Uso moderado de mayúsculas y exclamaciones.',
  'signal.content.shouting.abuse': 'Abuso de mayúsculas ({pct}% de palabras) o exclamaciones.',
  'signal.content.ads': 'Densidad de publicidad',
  'signal.content.ads.none': 'No se detecta publicidad intrusiva.',
  'signal.content.ads.some': {
    one: '{n} elemento publicitario detectado.',
    other: '{n} elementos publicitarios detectados.',
  },
  'signal.content.length': 'Extensión del contenido',
  'signal.content.length.short': 'Contenido muy breve ({n} palabras).',
  'signal.content.length.ok': { one: '{n} palabra.', other: '{n} palabras.' },

  'signal.ai.assessment': 'Valoración general de la IA',
  'signal.ai.assessment.text': '{text}',
  'signal.ai.tone': 'Tono',
  'signal.ai.tone.neutral': 'Tono neutral e informativo.',
  'signal.ai.tone.emotional': 'Tono emocional.',
  'signal.ai.tone.sensationalist': 'Tono sensacionalista.',
  'signal.ai.tone.propagandistic': 'Tono propagandístico.',
  'signal.ai.fallacies': 'Falacias detectadas',
  'signal.ai.fallacies.none': 'No se detectan falacias.',
  'signal.ai.fallacies.some': {
    one: 'Se detecta {n} posible falacia.',
    other: 'Se detectan {n} posibles falacias.',
  },
  'signal.ai.claimsSourced': 'Afirmaciones respaldadas',
  'signal.ai.claimsSourced.ratio': {
    one: '{sourced} de {n} afirmación verificable cita una fuente.',
    other: '{sourced} de {n} afirmaciones verificables citan una fuente; debajo, las que no.',
  },
  'signal.ai.factcheck': 'Verificaciones externas',
  'signal.ai.factcheck.clean': {
    one: '{n} verificación externa sin desmentidos.',
    other: '{n} verificaciones externas sin desmentidos.',
  },
  'signal.ai.factcheck.debunked': {
    one: '{n} afirmación ha sido desmentida por verificadores.',
    other: '{n} afirmaciones han sido desmentidas por verificadores.',
  },

  // Límites de la puntuación
  'cap.debunked': 'Contiene afirmaciones desmentidas por verificadores.',
  'cap.unreliable': 'El medio está señalado como poco fiable.',

  // Vista del análisis (paquete ui)
  'analysis.noData': 'sin datos',
  'analysis.noSignals': 'No se pudo medir ninguna señal.',
  'analysis.certainty': 'certeza {pct}%',
  'analysis.breakdown': 'Desglose',
  'analysis.ai': 'Análisis IA',
  'analysis.factChecks': 'Verificaciones relacionadas',
  'analysis.viewFactCheck': 'Ver verificación',
  'analysis.signalCount': { one: '{n} señal', other: '{n} señales' },
  // Motivos por los que no hay análisis con IA
  'aiUnavailable.noProvider':
    'Sin análisis con IA: no has elegido proveedor. Puedes activarlo en «Cuenta» (Puter u Ollama Cloud).',
  'aiUnavailable.tooShort': 'El texto es demasiado corto para analizarlo con IA.',
  'aiUnavailable.failed': 'La IA no respondió: {reason}',
  'aiUnavailable.serviceDown': 'El servicio de IA no está disponible ahora mismo.',
  'aiUnavailable.noServerProvider': 'No hay ningún proveedor de IA configurado.',
  'aiUnavailable.quota':
    'Has agotado los análisis con IA de hoy. Inicia sesión o añade tu propia clave para obtener más.',

  // Errores de la versión sin servidor
  'error.onlyHttp': 'Solo se pueden analizar enlaces http(s).',
  'error.download': 'No se pudo descargar la página (HTTP {status}).',
  'error.needsPuter':
    'Para analizar un enlace pegado aquí, inicia sesión en Puter (gratis) en «Cuenta», o usa la extensión de Confinet en la propia página.',
  'error.notAvailable': 'No disponible en la versión sin servidor.',
  'error.notSaved': 'Este análisis no está guardado en este navegador.',
  'error.ai.noJson': 'El modelo respondió sin JSON: "{snippet}…"',
  'error.ai.empty': 'El modelo devolvió una respuesta vacía.',
  'error.ai.invalid': 'El modelo no devolvió un análisis válido ({detail}).',
  'error.ai.truncated':
    'La respuesta del modelo se cortó antes de terminar. Prueba con otro modelo.',
  'error.ai.noModel': 'No hay modelo elegido.',
  'error.ai.noProvider': 'No hay proveedor de IA elegido.',
  'error.ai.noOllamaKey': 'Falta la API key de Ollama.',
  'error.ollama.cors':
    'El navegador bloqueó la conexión directa con Ollama. Inicia sesión en Puter para enviarla a través de su proxy.',
  'error.ollama.unauthorized': 'Ollama rechazó la API key (401). Revísala en Cuenta.',
  'error.ollama.limit': 'Ollama no aceptó la petición ({status}): revisa tu saldo o límite.',
  'error.ollama.http': 'Error de Ollama ({status}).',
  'error.settings.pickModel': 'Elige un modelo antes de guardar.',
  'error.settings.pasteKey': 'Pega tu API key de Ollama.',

  // Errores de la API (por su código); en español se muestra el texto exacto del servidor
  'apiError.not_found': 'No encontrado.',
  'apiError.invalid_body': 'Datos no válidos.',
  'apiError.invalid_json': 'El cuerpo no es JSON válido.',
  'apiError.internal': 'Error interno.',
  'apiError.forbidden': 'No tienes permiso para hacer esto.',
  'apiError.unauthorized': 'Inicia sesión para continuar.',
  'apiError.quota_exceeded': 'Has alcanzado el límite diario de análisis.',
  'apiError.invalid_url': 'URL no válida.',
  'apiError.blocked_url': 'Dirección no permitida.',
  'apiError.fetch_failed': 'No se pudo descargar la página.',
  'apiError.not_html': 'La URL no es una página HTML.',
  'apiError.too_large': 'La página es demasiado grande.',
  'apiError.invalid_provider': 'Proveedor no soportado.',
  'apiError.invalid_domain': 'Dominio no válido.',

  'analysis.disclaimer':
    'La puntuación es orientativa y se basa en señales automáticas. No sustituye tu propio criterio: contrasta la información con otras fuentes.',

  // Web: navegación, inicio, compartir y traspaso desde la extensión
  'nav.main': 'Principal',
  'nav.analyze': 'Analizar',
  'nav.history': 'Historial',
  'nav.account': 'Cuenta',
  'nav.admin': 'Admin',
  'nav.privacy': 'Privacidad',
  'nav.terms': 'Términos',
  'nav.language': 'Idioma',
  'home.title': '¿Te puedes fiar de lo que estás leyendo?',
  'home.intro':
    'Pega el enlace de una noticia o artículo y Confinet analizará la fuente, el contenido y el tono para darte una puntuación de confianza explicada.',
  'home.staticNote':
    'Esta versión funciona sin servidor. Para analizar un enlace pegado aquí, <puter>inicia sesión en Puter</puter> (gratis), o usa la <ext>extensión de Confinet</ext> directamente en la página.',
  'home.urlLabel': 'Enlace a analizar',
  'home.invalidUrl': 'Escribe un enlace válido (https://…).',
  'home.goToAccount': 'Ir a Cuenta',
  'home.analyzing': 'Analizando…',
  'home.analyze': 'Analizar',
  'home.paste': 'Pegar',
  'home.usage': 'Hoy: {analyses}/{maxAnalyses} análisis · {ai}/{maxAi} con IA',
  'home.usageByok': ' (más ilimitados con tu propia clave)',
  'home.howItWorks': 'Cómo funciona',
  'home.howSource': '<b>Fuente</b> — reputación del medio, antigüedad del dominio y transparencia.',
  'home.howContent':
    '<b>Contenido</b> — autoría, fecha, enlaces a fuentes, titulares sensacionalistas y publicidad.',
  'home.howAi':
    '<b>Análisis IA</b> — tono, falacias, afirmaciones sin respaldo y verificaciones externas.',
  'home.mobileTip':
    'En Android puedes usar <i>Compartir → Confinet</i> desde cualquier app tras instalar la aplicación. En iPhone, copia el enlace y pulsa «Pegar».',
  'share.noLink': 'No se encontró ningún enlace en lo que has compartido.',
  'share.pasteManually': 'Pegar un enlace manualmente',
  'share.failed': 'No se pudo analizar',
  'handoff.noData': 'No se ha recibido ninguna página para analizar.',
  'handoff.invalidData': 'Los datos recibidos de la extensión no son válidos.',
  'handoff.analyzing': 'Analizando la página…',
  'handoff.backHome': 'Volver al inicio',

  // Web: historial y resultado
  'common.loading': 'Cargando…',
  'common.notFound': 'No encontrado',
  'common.send': 'Enviar',
  'common.save': 'Guardar',
  'common.saving': 'Guardando…',
  'common.delete': 'Eliminar',
  'common.cancel': 'Cancelar',
  'common.signIn': 'Iniciar sesión',
  'common.signOut': 'Cerrar sesión',
  'history.signInTitle': 'Inicia sesión para guardar tu historial',
  'history.signInText': 'Tu historial se sincroniza entre la extensión del navegador y esta app.',
  'history.title': 'Historial',
  'history.clearConfirm': '¿Borrar todo el historial?',
  'history.clearAll': 'Borrar todo',
  'history.empty': 'Aún no has analizado nada.',
  'history.loadMore': 'Cargar más',
  'result.analyzeAnother': 'Analizar otro enlace',
  'result.feedbackThanks': '¡Gracias! Revisaremos tu aviso.',
  'result.feedbackTitle': '¿La puntuación no te parece correcta?',
  'result.feedbackTooHigh': 'Debería ser más baja',
  'result.feedbackTooLow': 'Debería ser más alta',
  'result.feedbackWrongSignal': 'Alguna señal es incorrecta',
  'result.feedbackOther': 'Otro',
  'result.feedbackPlaceholder': 'Cuéntanos por qué (opcional)',
  'result.reportOnGithub': '¿La puntuación no te parece correcta? Avísanos en GitHub',

  // Web: cuenta (versión sin servidor) e idioma
  'language.title': 'Idioma',
  'language.auto': 'Automático (el del navegador)',
  'language.help': 'También cambia el idioma en el que la IA escribe el resumen.',
  'staticAccount.title': 'Cuenta y ajustes',
  'staticAccount.providerNone': 'Ninguno (solo heurísticas)',
  'staticAccount.puterTitle': 'Sesión de Puter',
  'staticAccount.puterIntro':
    'Esta versión de Confinet no tiene servidor. Para analizar un enlace que pegues aquí, la página se descarga a través de <b>Puter</b> (gratis, con tu propia cuenta). Si usas la extensión de Confinet no hace falta: la extensión lee la página directamente.',
  'staticAccount.checking': 'Comprobando…',
  'staticAccount.puterSignedIn': '✓ Sesión de Puter iniciada',
  'staticAccount.puterSignOut': 'Cerrar sesión de Puter',
  'staticAccount.puterOpening': 'Abriendo Puter…',
  'staticAccount.puterSignIn': 'Iniciar sesión con Puter',
  'staticAccount.puterSignInError':
    'No se pudo iniciar sesión: {error}. Si no se abrió ninguna ventana, permite las ventanas emergentes para este sitio.',
  'staticAccount.aiTitle': 'Proveedor de IA (opcional)',
  'staticAccount.aiIntro':
    'Sin IA, Confinet puntúa con la fuente y el contenido. Con IA añade el tercer pilar: tono, falacias y afirmaciones sin respaldo. Tú eliges proveedor y modelo; no hay ninguno por defecto.',
  'staticAccount.current': 'Actual: <b>{provider}</b>{model}',
  'staticAccount.provider': 'Proveedor',
  'staticAccount.puterHelp':
    'Gratis para ti: el uso cuenta en tu propia cuenta de Puter, que incluye modelos de Claude, GPT, Gemini y otros.',
  'staticAccount.puterSignInFirst': 'Inicia sesión en Puter (arriba) para ver los modelos.',
  'staticAccount.ollamaHelp':
    'Modelos en la nube de Ollama (gpt-oss, DeepSeek, Qwen, GLM…). Se cobra por token a tu cuenta de Ollama. Crea la key en <link>ollama.com/settings/keys</link>. Se guarda solo en este navegador.',
  'staticAccount.ollamaKey': 'API key de Ollama',
  'staticAccount.keySaved':
    'Key guardada en este navegador; se conserva aunque cambies de proveedor.',
  'staticAccount.forgetKey': 'Olvidar key',
  'staticAccount.loadingModels': 'Cargando modelos…',
  'staticAccount.loadModels': 'Cargar modelos disponibles',
  'staticAccount.model': 'Modelo',
  'staticAccount.pickModel': 'Elige un modelo…',
  'staticAccount.modelPlaceholder': 'Carga la lista o escribe el nombre exacto',
  'staticAccount.saved': 'Guardado. Se usará en los próximos análisis.',
  'staticAccount.keyForgottenAiOff':
    'Key borrada. La IA queda desactivada hasta que elijas otro proveedor.',
  'staticAccount.keyForgotten': 'Key borrada de este navegador.',
  'staticAccount.dataTitle': 'Datos en este navegador',
  'staticAccount.dataText': {
    one: 'Tu historial ({n} análisis) y tus ajustes se guardan solo en este navegador. No se envían a ningún servidor de Confinet ni se sincronizan entre dispositivos.',
    other:
      'Tu historial ({n} análisis) y tus ajustes se guardan solo en este navegador. No se envían a ningún servidor de Confinet ni se sincronizan entre dispositivos.',
  },
  'staticAccount.clearConfirm': '¿Borrar todo el historial de este navegador?',
  'staticAccount.clearHistory': 'Borrar historial',

  // Web: cuenta (versión con servidor) y conexión de la extensión
  'account.signInTitle': 'Inicia sesión',
  'account.signInIntro':
    'Con una cuenta tienes más análisis con IA al día, historial sincronizado con la extensión y puedes usar tu propia clave de IA.',
  'account.continueGoogle': 'Continuar con Google',
  'account.continueGithub': 'Continuar con GitHub',
  'account.noLogin': 'El inicio de sesión no está configurado en este servidor.',
  'account.devTitle': 'Acceso de desarrollo',
  'account.devHelp': 'Solo visible con ENABLE_DEV_LOGIN=true.',
  'account.devPassword': 'contraseña (mín. 8)',
  'account.devSubmit': 'Entrar / registrarse',
  'account.usageToday':
    'Uso de hoy: {analyses}/{maxAnalyses} análisis · {ai}/{maxAi} con IA del servidor',
  'account.byokTitle': 'Tu propio modelo de IA (opcional)',
  'account.byokIntro':
    'Usa tu clave de cualquier proveedor (Anthropic, OpenAI, Gemini, Mistral, Groq, OpenRouter…) o un servidor compatible con OpenAI. Tus análisis con IA serán ilimitados y la clave se guarda cifrada; nunca se vuelve a mostrar.',
  'account.byokCurrent': 'Configurado: <b>{provider}</b> / {model}{key}',
  'account.byokKeySaved': ' · clave guardada',
  'account.provider': 'Proveedor',
  'account.pickProvider': 'Elige un proveedor…',
  'account.model': 'Modelo',
  'account.modelPlaceholder': 'Nombre exacto del modelo',
  'account.keepKey': '(déjala vacía para conservar la actual)',
  'account.baseUrl': 'URL base (debe ser accesible públicamente)',
  'account.saved': 'Guardado.',
  'account.remove': 'Quitar',
  'account.extensionsTitle': 'Extensiones conectadas',
  'account.extensionsNone':
    'Ninguna. Abre las opciones de la extensión y pulsa «Conectar con mi cuenta».',
  'account.extensionConnected': 'Conectada {date}',
  'account.extensionLastUsed': ' · último uso {date}',
  'account.disconnect': 'Desconectar',
  'connect.signInFirst': 'Primero inicia sesión',
  'connect.done': '✓ Extensión conectada',
  'connect.closeTab': 'Ya puedes cerrar esta pestaña.',
  'connect.title': 'Conectar la extensión',
  'connect.intro':
    'La extensión usará tu cuenta ({email}): tus análisis se guardarán en el historial y tendrás tu cuota de IA. Puedes desconectarla cuando quieras desde «Cuenta».',
  'connect.connect': 'Conectar',
  'connect.manual':
    'No se pudo enviar automáticamente. Copia este código en las opciones de la extensión:',

  // Web: administración
  'admin.onlyAdmins': 'Solo para administradores.',
  'admin.title': 'Administración',
  'admin.feedbackTitle': 'Avisos de usuarios',
  'admin.open': 'Abiertos',
  'admin.resolved': 'Resueltos',
  'admin.noFeedback': 'No hay avisos.',
  'admin.score': 'puntuación {score}',
  'admin.resolve': 'Resolver',
  'admin.reopen': 'Reabrir',
  'admin.reputationTitle': 'Reputación de dominios',
  'admin.domainPlaceholder': 'dominio.com',
  'admin.defaultSource': 'Revisión manual',
  'admin.sourcePlaceholder': 'Fuente de la valoración',
  'admin.notesPlaceholder': 'Notas (opcional)',
  'admin.filter': 'Filtrar…',
  'admin.edit': 'Editar',
  'admin.deleteConfirm': '¿Eliminar {domain}?',

  // Extensión
  'ext.options': 'Opciones',
  'ext.updateAvailable': 'Hay una versión nueva de Confinet (<b>{version}</b>).',
  'ext.download': 'Descargar',
  'ext.howToUpdate': 'Cómo actualizar',
  'ext.details': 'Ver detalles / informar error',
  'ext.reanalyze': 'Volver a analizar',
  'ext.fullAnalysis': 'Análisis completo en Confinet',
  'ext.connectAccount':
    '<link>Conecta tu cuenta</link> para tener más análisis con IA e historial.',
  'ext.reading': 'Leyendo la página…',
  'ext.quickEstimate': 'Estimación rápida (solo contenido)',
  'ext.localHint':
    'Para añadir la reputación del medio, la antigüedad del dominio y (si la activaste) la IA, abre el análisis completo.',
  'ext.fetchingFull': 'Consultando reputación y análisis con IA…',
  'ext.readFailed': 'No se pudo leer el contenido de la página.',
  'ext.cannotAnalyze': 'No se puede analizar esta página.',
  'ext.connectionError': 'Error de conexión con Confinet.',
  'ext.optionsTitle': 'Confinet — Opciones',
  'ext.account': 'Cuenta',
  'ext.connected': '✓ Extensión conectada a tu cuenta de Confinet.',
  'ext.viewHistory': 'Ver historial',
  'ext.disconnect': 'Desconectar',
  'ext.noAccount':
    'Sin cuenta puedes usar Confinet con un límite diario pequeño. Con cuenta tendrás más análisis con IA y el historial sincronizado con la app.',
  'ext.connectMyAccount': 'Conectar con mi cuenta',
  'ext.manualToken': '¿No funciona? Pega el código manualmente',
  'ext.tokenPrefix': 'El código debe empezar por "cnf_".',
  'ext.accountConnected': 'Cuenta conectada.',
  'ext.noPermission': 'Sin permiso no se puede analizar automáticamente.',
  'ext.autoTitle': 'Análisis automático',
  'ext.autoLabel': 'Analizar automáticamente los artículos que abro (sin IA).',
  'ext.autoHelp':
    'Requiere permiso para leer las páginas que visitas. Solo se envían a Confinet las páginas con aspecto de artículo. Desactivado, Confinet solo actúa cuando pulsas su icono.',
  'ext.privacy': 'Política de privacidad',
} as const satisfies Record<string, Message>;

export type MessageKey = keyof typeof es;
