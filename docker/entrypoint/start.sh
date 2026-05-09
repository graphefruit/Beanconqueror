#!/bin/sh
set -eu

export API_BASE_URL="${API_BASE_URL:-/api}"
export API_PORT="${API_PORT:-3000}"
if [ -z "${FEATURE_FLAGS_JSON:-}" ]; then
  FEATURE_FLAGS_JSON='{}'
fi
export FEATURE_FLAGS_JSON
export API_CLIENT_TOKEN

if [ "${NODE_ENV:-production}" != "development" ]; then
  if [ -z "${SESSION_SIGNING_SECRET:-}" ]; then
    echo "SESSION_SIGNING_SECRET is required outside development."
    exit 1
  fi
  if [ "${DB_PASSWORD:-}" = "beanconqueror" ] || [ "${MARIADB_ROOT_PASSWORD:-}" = "change-me" ]; then
    echo "Refusing insecure default DB credentials outside development."
    exit 1
  fi
else
  if [ -z "${SESSION_SIGNING_SECRET:-}" ]; then
    SESSION_SIGNING_SECRET="$(od -An -tx1 -N32 /dev/urandom | tr -d ' \n')"
  fi
fi
export SESSION_SIGNING_SECRET

envsubst < /tmp/env.template.js > /usr/share/nginx/html/assets/env.js

node /app/api/src/server.js &
api_pid="$!"

nginx -g 'pid /tmp/nginx.pid; daemon off;' &
nginx_pid="$!"

terminate() {
  kill "$api_pid" "$nginx_pid" 2>/dev/null || true
  wait "$api_pid" "$nginx_pid" 2>/dev/null || true
}

trap 'terminate; exit 143' TERM INT

set +e
while kill -0 "$api_pid" 2>/dev/null && kill -0 "$nginx_pid" 2>/dev/null; do
  sleep 1
done

if ! kill -0 "$api_pid" 2>/dev/null; then
  wait "$api_pid"
  status="$?"
else
  wait "$nginx_pid"
  status="$?"
fi

terminate
exit "$status"
