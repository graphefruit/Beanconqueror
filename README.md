# Beanconqueror (Docker + Gaggiuino Edition)

[![license](https://img.shields.io/badge/license-GPL%203.0-brightgreen.svg)](https://www.gnu.org/licenses/gpl-3.0.en.html)

Beanconqueror packaged for local/self-hosted use with:

- browser UI (Angular/Ionic)
- bundled API in same container
- persistent MariaDB storage
- direct Gaggiuino integration (import, sync, autosync monitor)

Primary target: Unraid + local network espresso setup.

## What this build changes

- Data stored in MariaDB, not browser localStorage as primary source.
- Container stays stateless; database handles persistence.
- Gaggiuino routes proxied server-side by bundled API.
- Optional autosync for new Gaggiuino shots.
- Scheduled AI shot analysis with cached recommendations.

## Quick start (local)

```bash
docker compose up --build -d
```

Open:

```text
http://localhost:8080
```

Services:

- `beanconqueror`: web UI + API
- `mariadb`: MariaDB 11
- `mariadb-data`: persistent Docker volume

## Environment variables

### Web/API

- `API_BASE_URL` (default `/api`)
- `API_AUTH_TOKEN` (optional; auto-generated if empty)
- `FEATURE_FLAGS_JSON` (optional JSON string)
- `CORS_ORIGINS` (comma-separated origins; default same-origin only)

### Database

- `DB_HOST` (default `mariadb`)
- `DB_PORT` (default `3306`)
- `DB_NAME` (default `beanconqueror`)
- `DB_USER` (default `beanconqueror`)
- `DB_PASSWORD` (required)

### Gaggiuino

- `GAGGIUINO_BASE_URL` (example `http://gaggiuino.local` or LAN IP)
- `GAGGIUINO_TIMEOUT_MS` (default `5000`)
- `GAGGIUINO_AUTOSYNC_ENABLED` (`true|false`)
- `GAGGIUINO_AUTOSYNC_INTERVAL_MS` (default `30000`)
- `GAGGIUINO_AUTOSYNC_MAX_BACKOFF_MS` (default `300000`)
- `GAGGIUINO_AUTOSYNC_BATCH_SIZE` (default `10`)
- `GAGGIUINO_AUTOSYNC_INITIAL_IMPORT_COUNT` (default `6`)

### AI analysis

- Configure provider in `Settings > AI`.
- Required for cloud AI calls: `provider`, `api key`, `model`.
- Optional scheduled analysis settings:
  - cadence hours
  - snapshot retention count
  - statistics visibility
- Analysis outputs cached in MariaDB:
  - `AI_ANALYSIS_CONFIG`
  - `AI_ANALYSIS_STATUS`
  - `AI_ANALYSIS_SNAPSHOTS`

## Gaggiuino workflow

1. Configure `GAGGIUINO_BASE_URL` in container env.
2. Open app `Gaggiuino` page.
3. Pull shot history from Gaggiuino API.
4. Cache/imported shots stored in MariaDB.
5. Sync to brews creates/updates Beanconqueror brew records.
6. Optional autosync polls incrementally and syncs new shots.

Dashboard and Gaggiuino page expose autosync status + manual sync-now action.

## AI statistics workflow

1. Open `Settings > AI` and configure provider/key/model.
2. Enable schedule (or run manually).
3. Open `Statistics > AI Analysis`.
4. Review:
   - health + last run
   - ranked recommendations
   - evidence metrics
   - snapshot history and rating deltas

## Unraid

Template file:

```text
unraid/beanconqueror.xml
```

Run MariaDB container on same host/network, then map:

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`

Default web port mapping:

- container `80`
- host `8080`

## Persistence + backup

- Back up MariaDB database/volume (`mariadb-data`).
- App container can be recreated safely.
- Mobile exports still importable.

## Development

Requirements:

- Node.js `>=22`
- pnpm `>=10.26.0`
- Docker Desktop

Install:

```bash
pnpm install
```

Frontend dev:

```bash
pnpm start
```

Build:

```bash
pnpm run build
```

Local full stack:

```powershell
scripts/local-stack.ps1 up
```

More details:

- [docs/local-testing.md](docs/local-testing.md)
- [docs/container-deployment.md](docs/container-deployment.md)

## Container publishing

Workflow:

```text
.github/workflows/container-image.yml
```

- PRs build image
- branch/tag/manual can publish to GHCR
- `latest` tag only from default branch

## License

GPL-3.0. See [LICENSE](LICENSE).
