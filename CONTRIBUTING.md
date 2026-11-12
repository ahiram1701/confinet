# Contribuir a Confinet

¡Gracias por querer mejorar Confinet! Toda ayuda cuenta: avisos de puntuaciones incorrectas,
documentación, código o ideas.

## Formas de contribuir

- **¿Una puntuación te parece incorrecta?** Usa el botón del resultado o la plantilla
  [«Puntuación incorrecta»](https://github.com/ahiram1701/confinet/issues/new/choose).
- **¿Un fallo?** Abre un issue con la plantilla «Error» y los pasos para reproducirlo.
- **¿Una idea?** Abre un issue «Mejora» antes de trabajar en ella, para comentarla.

## Preparar el entorno

Requisitos: Node 22+ y pnpm 10. Consulta la sección [Desarrollo](README.md#desarrollo) del README.

```bash
pnpm install
```

```bash
pnpm turbo run lint typecheck test
```

## Flujo de trabajo

1. Haz un fork y crea una rama desde `main` (`feat/…`, `fix/…`, `docs/…`).
2. Haz cambios pequeños y enfocados, con tests cuando cambie el comportamiento.
3. Si el cambio afecta a lo que ve el usuario, actualiza la [guía de uso](docs/guia-de-uso.md) y,
   si hace falta, las capturas (`node apps/web/scripts/screenshots.mjs`).
4. Añade un changeset para los cambios publicables: `pnpm changeset`.
5. Comprueba que pasan formato, lint, tipos y tests, y abre el PR con la plantilla.

## Convenciones

- TypeScript estricto. Formato con Prettier (`pnpm format`).
- Textos de la interfaz claros y sin tecnicismos, **siempre traducidos** (ver abajo).
- Toda señal nueva debe tener una **explicación legible** y un test en `packages/core`.
- La reputación de medios debe basarse en fuentes verificables y con licencia compatible: no se
  aceptan valoraciones subjetivas sin respaldo.
- Ningún proveedor ni modelo de IA debe quedar activado por defecto.

## Textos e idiomas

La interfaz está en español e inglés. Ningún texto visible va escrito directamente en el código:
todos están en [`packages/i18n`](packages/i18n/src).

- **Añadir un texto**: ponlo en `es.ts` (el diccionario de referencia) y en `en.ts`, con la misma
  clave. Si falta en `en.ts`, `pnpm typecheck` falla; si los `{parámetros}` no coinciden, falla el
  test de `packages/i18n`.
- **Usarlo**: en React, `const { t } = useI18n()` y `t('clave', { n })`. Para frases con un
  enlace o una negrita dentro, `rich('clave', { link: (s) => <a …>{s}</a> })` con
  `<link>…</link>` en el texto. Si un texto depende de un número, usa `{ one, other }`.
- **Señales y errores**: se guardan como clave + parámetros (`signal(id, valor, 'signal.…', {…})`,
  `new AppError('error.…')`), así un análisis guardado se ve en el idioma que elija cada persona.
- **Añadir un idioma**: crea `xx.ts` con el tipo `Record<MessageKey, Message>`, añádelo a `LOCALES`
  y `DICTIONARIES` en `index.ts`, y crea `apps/extension/public/_locales/xx/messages.json`.

## Licencia

Al contribuir aceptas que tu aportación se publique bajo la [licencia MIT](LICENSE) del proyecto.
