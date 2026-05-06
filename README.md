# Beanconqueror Web Container

[![license](https://img.shields.io/badge/license-GPL%203.0-brightgreen.svg)](https://www.gnu.org/licenses/gpl-3.0.en.html)

Beanconqueror tracks beans, brews, grinders, preparation methods, water recipes, roast data, tasting notes, and brew history.

This repository packages Beanconqueror as a browser-based Docker and Unraid app. It serves the Angular/Ionic web UI with Nginx, runs a bundled Node API, stores app data in MariaDB, and can proxy/import shot data from a local Gaggiuino API.

## Quick Start

```bash
docker compose up --build
```

Open:

```text
http://localhost:8080
```

Compose starts:

- `beanconqueror`: Nginx, web UI, and bundled Node API.
- `mariadb`: MariaDB 11 database.
- `mariadb-data`: persistent database volume.

## Published Image

Run Beanconqueror against an existing MariaDB-compatible database:

```bash
docker run --rm -p 8080:80 \
  -e API_BASE_URL=/api \
  -e DB_HOST=mariadb \
  -e DB_PORT=3306 \
  -e DB_NAME=beanconqueror \
  -e DB_USER=beanconqueror \
  -e DB_PASSWORD=change-me \
  ghcr.io/salthepal/beanconqueror:latest
```

The Beanconqueror container is stateless. Back up MariaDB, not the app container.

## Unraid

Template:

```text
unraid/beanconqueror.xml
```

Install or configure a MariaDB container on the same Unraid server, then set Beanconqueror database variables to match it:

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`

Default web settings:

- container port: `80`
- host port: `8080`
- browser API base URL: `/api`

`API_AUTH_TOKEN` can be left blank. The container generates one at startup and injects it into the web app. Set a fixed token only if another trusted client needs to call the API.

## Persistence And Migration

Server mode uses MariaDB through the bundled API. Browser storage is not the source of truth once `API_BASE_URL=/api`.

On first startup with server mode enabled, Beanconqueror checks whether MariaDB storage is empty. If it finds existing browser storage in the same browser profile, it imports that data into MariaDB once. After that, backups should target the MariaDB database or volume.

Mobile exports can still be imported. Native file references from mobile backups, such as `file://`, `content://`, or `capacitor://`, cannot be resolved by a normal browser and may need manual reattachment.

## Gaggiuino

Set `GAGGIUINO_BASE_URL` to your Gaggiuino machine API URL:

```text
http://gaggiuino.local
```

If Docker cannot resolve mDNS, use a fixed LAN IP:

```text
http://192.168.1.50
```

The bundled API talks to Gaggiuino from the server side, so browser CORS and local-network restrictions do not block shot imports.

## Runtime Configuration

Container startup renders `/usr/share/nginx/html/assets/env.js` from `docker/runtime-config/env.template.js`.

Variables:

- `API_BASE_URL`: browser API base URL. Default: `/api`.
- `API_AUTH_TOKEN`: token required by storage and Gaggiuino API endpoints. If blank, generated at startup.
- `CORS_ORIGINS`: comma-separated external origins allowed to call the API. Default empty value supports same-origin app use only.
- `FEATURE_FLAGS_JSON`: optional JSON object injected into the web app. Default: `{}`.
- `DB_HOST`: MariaDB host. Default: `mariadb`.
- `DB_PORT`: MariaDB port. Default: `3306`.
- `DB_NAME`: MariaDB database. Default: `beanconqueror`.
- `DB_USER`: MariaDB username. Default: `beanconqueror`.
- `DB_PASSWORD`: MariaDB password.
- `GAGGIUINO_BASE_URL`: local Gaggiuino API URL. Default: `http://gaggiuino.local`.
- `GAGGIUINO_TIMEOUT_MS`: Gaggiuino request timeout. Default: `5000`.

## Browser Limits

This build runs in a standard browser. Native Android and iOS shells are not included.

Unavailable or limited:

- native Android/iOS packaging
- native Bluetooth scale bridge
- native wake lock adapter
- native camera adapter
- native mobile file URI access

## Development

Requirements:

- Node.js `>=22`
- pnpm `>=10.26.0`

Install dependencies:

```bash
pnpm install
```

Start frontend dev server:

```bash
pnpm start
```

Run API locally:

```bash
cd api
npm install
npm start
```

Build:

```bash
pnpm run build
```

Test:

```bash
pnpm test
```

## More Details

Deployment notes: [docs/container-deployment.md](docs/container-deployment.md)

Image publishing: `.github/workflows/container-image.yml`

- pull requests build image without publishing
- branch, tag, and manual runs publish to GitHub Container Registry
- `latest` is emitted only for repository default branch

## License

Beanconqueror is licensed under GPL-3.0. See [LICENSE](LICENSE).
