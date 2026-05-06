# Container Deployment

## What Is Included

- Multi-stage Docker build.
- Angular production build served by Nginx.
- Bundled Node API proxied at `/api`.
- MariaDB-backed app storage.
- Local Gaggiuino API proxy/import endpoints.
- Runtime config templating with `envsubst` into `assets/env.js`.
- Token-protected API calls from the browser app to the bundled API.
- Example `docker-compose.yml` binding host port `8080` to container port `80`.

## Build And Run

```bash
docker compose up --build
```

Open `http://localhost:8080`.

Compose starts the app and MariaDB. MariaDB data persists in the `mariadb-data` named volume.

## Published Image

```bash
docker run --rm -p 8080:80 \
  -e DB_HOST=mariadb \
  -e DB_NAME=beanconqueror \
  -e DB_USER=beanconqueror \
  -e DB_PASSWORD=change-me \
  -e API_BASE_URL=/api \
  ghcr.io/salthepal/beanconqueror:latest
```

Use this with an existing MariaDB-compatible database.

## Unraid

Template: `unraid/beanconqueror.xml`.

Install a MariaDB container on the same server and set the Beanconqueror DB variables to match it:

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`

The Beanconqueror container does not need an app-data volume for normal use. Persistent data lives in MariaDB.

## Runtime Env Templating

At container start, `docker/entrypoint/start.sh` generates:

- template: `/tmp/env.template.js`
- output: `/usr/share/nginx/html/assets/env.js`

Supported browser config:

- `API_BASE_URL` defaults to `/api`
- `API_AUTH_TOKEN` is injected into browser requests. If omitted, startup generates one.
- `FEATURE_FLAGS_JSON` defaults to `{}`

Supported API config:

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `CORS_ORIGINS`
- `GAGGIUINO_BASE_URL`
- `GAGGIUINO_TIMEOUT_MS`

The generated `assets/env.js` is loaded by `src/index.html` before app bootstrap.

`CORS_ORIGINS` is empty by default. Leave it empty for the bundled same-origin app. Set it only when a separate trusted origin must call the API.

## API Endpoints

Storage:

- `GET /api/storage`
- `GET /api/storage/:key`
- `PUT /api/storage/:key`
- `POST /api/storage/import`
- `DELETE /api/storage`

Gaggiuino:

- `GET /api/gaggiuino/status`
- `GET /api/gaggiuino/shots/latest`
- `GET /api/gaggiuino/shots/:id`
- `GET /api/gaggiuino/shots`
- `POST /api/gaggiuino/shots/import-latest`

All storage and Gaggiuino API endpoints require `X-Beanconqueror-Api-Token` or `Authorization: Bearer <token>` when `API_AUTH_TOKEN` is set. The bundled container sets or generates this token before rendering `assets/env.js`.

## Gaggiuino Notes

Default:

```text
GAGGIUINO_BASE_URL=http://gaggiuino.local
```

If Docker cannot resolve mDNS, use a fixed LAN IP:

```text
GAGGIUINO_BASE_URL=http://192.168.1.50
```

Set a DHCP reservation for the Gaggiuino machine if using a LAN IP.

## Persistence Expectations

Beanconqueror user data is stored in MariaDB through the bundled API. Browser storage may still be used by app code as cache or migration staging, but it is not the intended source of truth when `API_BASE_URL=/api`.

If a user upgrades from browser-only storage, startup checks whether server storage is empty. When empty and existing browser data is present, that browser data is imported into MariaDB once.

Back up the MariaDB database or its volume as part of normal Unraid backup policy.
