## Qué cambia y por qué

<!-- Describe el cambio y enlaza el issue relacionado (Closes #…). -->

## Cómo se ha probado

- [ ] `pnpm turbo run lint typecheck test`
- [ ] E2E si cambia la interfaz (`pnpm --filter @confinet/web e2e` / `e2e:static`)
- [ ] Probado a mano en el navegador

## Checklist

- [ ] La [guía de uso](../docs/guia-de-uso.md) y las capturas siguen siendo correctas
- [ ] Añadido un changeset (`pnpm changeset`) si es un cambio publicable
- [ ] No se activa ningún proveedor ni modelo de IA por defecto
