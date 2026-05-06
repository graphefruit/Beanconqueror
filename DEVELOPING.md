# Developer Instructions

Beanconqueror is maintained here as a container-focused Angular/Ionic web app with a bundled Node API and MariaDB persistence.

## Prerequisites

- Git
- Node.js `>=22`
- pnpm `>=10.26.0`
- Docker or Docker Compose for full-stack local validation

## Install

```shell
pnpm install
cd api
npm install
```

## Frontend Development

```shell
pnpm start
```

Open `http://localhost:4200`.

By default the frontend can still fall back to browser storage. For server-backed development, provide a runtime config that points `API_BASE_URL` to a running API.

## API Development

The API expects MariaDB connection variables:

```shell
DB_HOST=localhost
DB_PORT=3306
DB_NAME=beanconqueror
DB_USER=beanconqueror
DB_PASSWORD=beanconqueror
GAGGIUINO_BASE_URL=http://gaggiuino.local
```

Run:

```shell
cd api
npm start
```

## Full Container Stack

```shell
docker compose up --build
```

Open `http://localhost:8080`.

## Checks

```shell
pnpm run build
pnpm test
pnpm run lint
```

API syntax check:

```shell
node --check api/src/server.js
```

## Notes

Android and iOS project files are intentionally not part of this repository. Avoid reintroducing native mobile build artifacts, store screenshots, Capacitor platform directories, or mobile-only documentation.
