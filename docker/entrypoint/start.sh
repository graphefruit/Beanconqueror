#!/bin/sh
set -eu

export API_BASE_URL="${API_BASE_URL:-/api}"
export FEATURE_FLAGS_JSON="${FEATURE_FLAGS_JSON:-{}}"
export API_PORT="${API_PORT:-3000}"

envsubst < /tmp/env.template.js > /usr/share/nginx/html/assets/env.js

node /app/api/src/server.js &
api_pid="$!"

trap 'kill "$api_pid" 2>/dev/null || true' TERM INT

nginx -g 'daemon off;' &
nginx_pid="$!"

wait "$nginx_pid"
