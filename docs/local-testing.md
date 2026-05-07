# Local testing

Use this before pushing an image or updating Unraid.

## Full stack

Requires Docker Desktop.

```powershell
scripts/local-stack.ps1 up
```

Open http://localhost:8080.

Stack:

- `beanconqueror`: built from local working tree, serves SPA, API, and `/health`.
- `mariadb`: MariaDB 11 with `mariadb-data` Docker volume.
- Runtime browser config points app storage at `/api`, so data persists in MariaDB instead of browser storage.

Useful commands:

```powershell
scripts/local-stack.ps1 status
scripts/local-stack.ps1 logs
scripts/local-stack.ps1 down
scripts/local-stack.ps1 reset
```

`reset` deletes local MariaDB test data by removing Docker volumes.

## UI-only fallback

Use this only when Docker is unavailable. It tests layout and client-side crashes, but storage falls back to browser storage.

```powershell
pnpm start
```

Open http://localhost:4200.

## Test pass checklist

- Load `http://localhost:8080` with no critical error modal.
- Confirm dashboard desktop layout at 1440px wide.
- Confirm mobile layout at 390px wide.
- Add one brew or import a backup.
- Reload page and confirm data remains.
- Run `Invoke-WebRequest http://localhost:8080/health`.
- Check `scripts/local-stack.ps1 logs` for API, MariaDB, or nginx errors.
