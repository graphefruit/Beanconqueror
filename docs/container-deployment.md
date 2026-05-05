# Container deployment (Angular static web build)

## What is included

- Multi-stage Docker build: `node:22-alpine` for compile, `nginx:alpine` for runtime.
- SPA fallback (`try_files ... /index.html`) so deep links like `/brew/123` resolve correctly.
- Optional runtime config templating with `envsubst` into `assets/env.js`.
- Example `docker-compose.yml` binding host port `8080` to container port `80`.

## Build and run

```bash
docker compose up --build
```

Then open `http://localhost:8080`.

Published images are available from GitHub Container Registry:

```bash
docker run --rm -p 8080:80 ghcr.io/salthepal/beanconqueror:latest
```

## Unraid

An Unraid Community Applications template is available at `unraid/beanconqueror.xml`. It exposes container port `80` as host port `8080` by default and does not require a persistent volume.

## Runtime env templating

At container start, `/docker-entrypoint.d/40-envsubst-on-template.sh` generates:

- template: `/tmp/env.template.js`
- output: `/usr/share/nginx/html/assets/env.js`

Supported variables:

- `API_BASE_URL` (defaults to an empty string)
- `FEATURE_FLAGS_JSON` (defaults to `{}` and must be valid JSON, e.g. `{"featureA":true}`)

Compose example:

```yaml
environment:
  API_BASE_URL: "https://api.example.com"
  FEATURE_FLAGS_JSON: '{"brewSharing":true,"betaFlow":false}'
```

The generated `assets/env.js` is loaded by `src/index.html` before app bootstrap. Read values from `window.__beanconquerorConfig` when adding runtime-configurable web behavior.

## Data persistence expectations

### Container filesystem / volumes

This static web container does **not** require a persistent volume for normal operation. It serves immutable frontend files from the image layer.

A volume is only optional if you deliberately want to:

- override static files at runtime,
- or collect custom Nginx logs outside container lifecycle.

### User data in browsers

Beanconqueror user data for web users is stored in the **browser storage** (e.g., IndexedDB/LocalStorage depending on app behavior), not inside the web container filesystem.

That means:

- Recreating or upgrading the container does not by itself erase browser-stored user data.
- Clearing browser site data or using a different browser/device does affect availability of that user data.
