# Beanconqueror Web Container

[![license](https://img.shields.io/badge/license-GPL%203.0-brightgreen.svg)](https://www.gnu.org/licenses/gpl-3.0.en.html)

Beanconqueror is a coffee tracking app for beans, brews, grinders, preparation methods, water recipes, roasting, tasting notes, and brew history.

This fork packages Beanconqueror as a browser-based Docker and Unraid app with server-side MariaDB persistence and local Gaggiuino API imports.

## What This Build Provides

- Angular/Ionic web app served by Nginx.
- Bundled Node API under `/api`.
- MariaDB-backed app storage.
- Docker Compose example with MariaDB.
- Unraid Community Applications template in `unraid/beanconqueror.xml`.
- Runtime config injection through `/assets/env.js`.
- Local Gaggiuino API proxy/import support.
- API token protection for storage and Gaggiuino endpoints.

## Run With Docker Compose

```bash
docker compose up --build
```

Open `http://localhost:8080`.

Compose starts:

- `beanconqueror`: Nginx, Angular app, and Node API
- `mariadb`: persistent MariaDB database
- `mariadb-data`: database volume

## Run Published Image

```bash
docker run --rm -p 8080:80 \
  -e DB_HOST=mariadb \
  -e DB_NAME=beanconqueror \
  -e DB_USER=beanconqueror \
  -e DB_PASSWORD=change-me \
  -e API_BASE_URL=/api \
  ghcr.io/salthepal/beanconqueror:latest
```

This command expects an existing MariaDB-compatible database reachable as `mariadb`.

## Unraid

Use the template at:

```text
unraid/beanconqueror.xml
```

Install or configure a MariaDB container on the same Unraid server, then set:

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`

Default web settings:

- container port: `80`
- host port: `8080`
- API base URL: `/api`

Beanconqueror data is stored in MariaDB. The Beanconqueror container itself is stateless; database persistence belongs to the MariaDB container/volume.

## Gaggiuino

Set `GAGGIUINO_BASE_URL` to the machine API URL:

```text
http://gaggiuino.local
```

If Docker cannot resolve mDNS, use a fixed LAN IP instead:

```text
http://192.168.1.50
```

The backend talks to Gaggiuino from the server side, so browser CORS and local network restrictions do not block shot imports.

## Runtime Configuration

The container entrypoint generates `/usr/share/nginx/html/assets/env.js` from `/tmp/env.template.js`.

Supported variables:

- `API_BASE_URL`: browser API base URL, default `/api`.
- `API_AUTH_TOKEN`: API token for storage and Gaggiuino endpoints. If blank, the container generates one at startup and injects it into `/assets/env.js`.
- `CORS_ORIGINS`: comma-separated external browser origins allowed to call the API. Default is empty, which allows same-origin app use only.
- `FEATURE_FLAGS_JSON`: optional JSON object, default `{}`.
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: MariaDB connection.
- `GAGGIUINO_BASE_URL`: local Gaggiuino API URL.
- `GAGGIUINO_TIMEOUT_MS`: Gaggiuino request timeout.

## Browser Runtime Notes

This build runs in a standard browser. Native mobile features are not available.

When `API_BASE_URL=/api`, existing browser storage is migrated into MariaDB once if server storage is empty. After migration, MariaDB is the source of truth.

Unavailable or limited:

- native Android/iOS packaging
- native Bluetooth scale bridge
- native wake lock adapter
- native camera adapter
- native file URI access such as `file://`, `content://`, or `capacitor://`

Mobile exports can be imported in browser mode. Native file URI references from mobile backups may not resolve in browsers; reattach affected files manually.

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

Build frontend:

```bash
pnpm run build
```

Test:

```bash
pnpm test
```

## Container Details

More deployment notes live in [docs/container-deployment.md](docs/container-deployment.md).

Image publishing is handled by `.github/workflows/container-image.yml`:

- pull requests build the image without publishing
- branch/tag/manual runs publish to GitHub Container Registry
- `latest` is only emitted for the repository default branch

## License

Beanconqueror is licensed under GPL-3.0. See [LICENSE](LICENSE).
