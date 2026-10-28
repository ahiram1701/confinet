#!/usr/bin/env bash
# Sube y publica un .zip en Microsoft Edge Add-ons (API de publicación v1.1).
# Requiere: EDGE_PRODUCT_ID, EDGE_CLIENT_ID, EDGE_API_KEY (Partner Center → Publish API).
set -euo pipefail

ZIP="$1"
API="https://api.addons.microsoftedge.microsoft.com/v1/products/${EDGE_PRODUCT_ID}/submissions"
AUTH=(-H "Authorization: ApiKey ${EDGE_API_KEY}" -H "X-ClientID: ${EDGE_CLIENT_ID}")

echo "Subiendo ${ZIP}…"
OPERATION=$(curl -fsS -D - -o /dev/null "${AUTH[@]}" -H "Content-Type: application/zip" \
  -X POST "${API}/draft/package" --data-binary "@${ZIP}" | awk -F': ' 'tolower($1)=="location"{print $2}' | tr -d '\r')
OPERATION="${OPERATION##*/}" # la cabecera Location puede traer la ruta completa

for _ in $(seq 1 30); do
  STATUS=$(curl -fsS "${AUTH[@]}" "${API}/draft/package/operations/${OPERATION}" | jq -r .status)
  echo "Estado de la subida: ${STATUS}"
  [ "$STATUS" = "Succeeded" ] && break
  [ "$STATUS" = "Failed" ] && exit 1
  sleep 10
done

echo "Enviando a revisión…"
curl -fsS "${AUTH[@]}" -H "Content-Type: application/json" -X POST "${API}" \
  -d "{\"notes\": \"Publicado desde GitHub Actions (${GITHUB_REF_NAME:-manual})\"}"
echo "Enviado. Microsoft revisará la extensión (puede tardar varios días)."
