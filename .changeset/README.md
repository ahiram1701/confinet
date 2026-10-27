# Changesets

Cada cambio relevante va acompañado de un changeset:

```bash
pnpm changeset          # describe el cambio y elige patch/minor/major por paquete
pnpm changeset version  # aplica las versiones y actualiza los CHANGELOG
```

Después crea el tag correspondiente (`v1.2.3` para API + PWA, `ext-v1.2.3` para la extensión).
