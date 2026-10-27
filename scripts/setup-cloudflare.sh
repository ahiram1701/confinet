#!/usr/bin/env bash
# Prepara la cuenta de Cloudflare (plan gratuito) una sola vez:
#   - crea las bases de datos D1 de staging y producción y escribe sus IDs en wrangler.toml
#   - crea el proyecto de Cloudflare Pages con "production" como rama de producción
# Requisitos: `pnpm install` hecho y sesión iniciada (`pnpm --filter @confinet/api exec wrangler login`).
set -euo pipefail
cd "$(dirname "$0")/.."

WRANGLER="pnpm --filter @confinet/api exec wrangler"
TOML="apps/api/wrangler.toml"

create_db() {
  local name="$1" placeholder="$2"
  if ! grep -q "$placeholder" "$TOML"; then
    echo "• $name ya configurada en $TOML"
    return
  fi
  echo "• Creando D1 $name…"
  local id
  id=$($WRANGLER d1 create "$name" 2>&1 | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)
  [ -n "$id" ] || { echo "No se pudo obtener el ID de $name"; exit 1; }
  sed -i.bak "s/$placeholder/$id/" "$TOML" && rm -f "$TOML.bak"
  echo "  → $id"
}

create_db confinet-staging REEMPLAZAR_ID_D1_STAGING
create_db confinet-production REEMPLAZAR_ID_D1_PRODUCTION

echo "• Creando proyecto de Pages 'confinet' (si no existe)…"
$WRANGLER pages project create confinet --production-branch production || true

cat <<'MSG'

Listo. Siguientes pasos (ver README → Despliegue):
  1. Haz commit de apps/api/wrangler.toml con los IDs de D1.
  2. En GitHub → Settings → Environments crea "staging" y "production" con sus secretos.
  3. Haz push a main para desplegar staging.
MSG
