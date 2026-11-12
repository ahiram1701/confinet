# Datos de reputación de terceros

## `reputation-wikipedia.json`

Dominios valorados en la lista
[Wikipedia: Reliable sources/Perennial sources](https://en.wikipedia.org/wiki/Wikipedia:Reliable_sources/Perennial_sources),
elaborada por los editores de Wikipedia en inglés.

- **Licencia**: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Este archivo
  **no** está bajo la licencia MIT del resto del proyecto: si lo reutilizas, atribúyelo a los
  autores de Wikipedia y compártelo con la misma licencia.
- **Cambios respecto al original**: solo se conservan el nombre de la fuente, su valoración y sus
  dominios. Las valoraciones se simplifican así:
  - _generally reliable_ → `reliable`;
  - _no consensus_ → `mixed`;
  - _generally unreliable_, _deprecated_ y _blacklisted_ → `unreliable`.

  Si una fuente o dominio tiene valoraciones distintas (por tema o por época), queda como
  `mixed`.

- **Actualizar**: `node scripts/update-reputation.mjs` (Node 23.6 o superior). La fecha de la
  última actualización está en `generatedAt`.

Confinet consulta esta lista después de su propia semilla
(`apps/api/migrations/0001_seed_reputation.sql`), que tiene prioridad.
