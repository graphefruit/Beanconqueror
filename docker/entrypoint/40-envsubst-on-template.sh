#!/bin/sh
set -eu

TEMPLATE_FILE="/usr/share/nginx/html/assets/env.template.js"
OUTPUT_FILE="/usr/share/nginx/html/assets/env.js"

if [ -f "$TEMPLATE_FILE" ]; then
  envsubst '${API_BASE_URL} ${FEATURE_FLAGS_JSON}' < "$TEMPLATE_FILE" > "$OUTPUT_FILE"
  echo "[entrypoint] Generated runtime config: $OUTPUT_FILE"
fi
