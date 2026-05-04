#!/bin/sh
set -eu

TEMPLATE_FILE="/tmp/env.template.js"
OUTPUT_FILE="/usr/share/nginx/html/assets/env.js"

if [ -f "$TEMPLATE_FILE" ]; then
  export API_BASE_URL="${API_BASE_URL:-}"
  export FEATURE_FLAGS_JSON="${FEATURE_FLAGS_JSON:-{}}"
  envsubst '${API_BASE_URL} ${FEATURE_FLAGS_JSON}' < "$TEMPLATE_FILE" > "$OUTPUT_FILE"
  echo "[entrypoint] Generated runtime config: $OUTPUT_FILE"
fi
