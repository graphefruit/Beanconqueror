# Beanconqueror Web Container

[![license](https://img.shields.io/badge/license-GPL%203.0-brightgreen.svg)](https://www.gnu.org/licenses/gpl-3.0.en.html)

Beanconqueror is a coffee tracking app for beans, brews, grinders, preparation methods, water recipes, roasting, tasting notes, and brew history.

This fork packages Beanconqueror as a browser-based web app for Docker and Unraid. The Android and iOS project files are intentionally not part of this container-focused repository.

## What This Build Provides

- Angular/Ionic web app served by Nginx.
- Docker image build from `Dockerfile`.
- Docker Compose example in `docker-compose.yml`.
- Unraid Community Applications template in `unraid/beanconqueror.xml`.
- Runtime config injection through `/assets/env.js`.
- Local browser storage using IndexedDB with LocalStorage fallback.

## Run With Docker

```bash
docker run --rm -p 8080:80 ghcr.io/salthepal/beanconqueror:latest
```

Open `http://localhost:8080`.

## Run With Docker Compose

```bash
docker compose up --build
```

Open `http://localhost:8080`.

## Unraid

Use the template at:

```text
unraid/beanconqueror.xml
```

Default settings:

- container port: `80`
- host port: `8080`
- persistent volume: none required

Beanconqueror data is stored in browser storage, not inside the container filesystem. Recreating the container does not delete browser-stored data, but clearing site data or switching browsers/devices affects access to it.

## Runtime Configuration

The container entrypoint generates `/usr/share/nginx/html/assets/env.js` from `/tmp/env.template.js`.

Supported variables:

- `API_BASE_URL`: optional API base URL.
- `FEATURE_FLAGS_JSON`: optional JSON object, default `{}`.

Example:

```yaml
environment:
  API_BASE_URL: 'https://api.example.com'
  FEATURE_FLAGS_JSON: '{"brewSharing":true,"betaFlow":false}'
```

## Browser Runtime Notes

This build runs in a standard browser. Native mobile features are not available.

Unavailable or limited:

- native Android/iOS packaging
- native Bluetooth scale bridge
- native wake lock adapter
- native camera adapter
- native file URI access such as `file://`, `content://`, or `capacitor://`

Browser-supported camera, import, export, and storage behavior can still work where supported by the browser and app code.

## Development

Requirements:

- Node.js `>=22`
- pnpm `>=10.26.0`

Install dependencies:

```bash
pnpm install
```

Start dev server:

```bash
pnpm start
```

Build:

```bash
pnpm run build
```

Test:

```bash
pnpm test
```

Lint:

```bash
pnpm run lint
```

## Container Details

More deployment notes live in [docs/container-deployment.md](docs/container-deployment.md).

Image publishing is handled by `.github/workflows/container-image.yml`:

- pull requests build the image without publishing
- branch/tag/manual runs publish to GitHub Container Registry
- `latest` is only emitted for the repository default branch

## Import And Persistence

Mobile exports can be imported in browser mode. Native file URI references from mobile backups may not resolve in browsers; reattach affected files manually.

Normal app data remains local to the browser profile. Back up data through app export flows before clearing browser storage or moving devices.

## License

Beanconqueror is licensed under GPL-3.0. See [LICENSE](LICENSE).
