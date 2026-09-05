# Employee Management Web — Frontend

Angular 18 (standalone components, Signals, new control flow) SPA for the
Employee Management System. See `../ARCHITECTURE.md` for system diagrams and
request flows.

## 1. Prerequisites

| Tool | Version |
|---|---|
| Node.js | 20.x LTS |
| npm | 10.x (bundled with Node 20) |
| Backend API | running and reachable (see `../backend/README.md`) |

## 2. First-time setup

```bash
cd frontend
npm install
cp .env.example .env
```

Open `.env` and set at least:
- `API_BASE_URL` — where the backend is reachable (default `http://localhost:3000/api/v1`).
- `AUTH_BYPASS` — leave `false` unless you're doing local UI-only work against a backend also running with `JWT_BYPASS=true`.

> **Why a `.env` file for a browser app?** Angular has no server process reading `process.env` at request time — a `.env` file can't be read live by code running in someone's browser. Instead, `npm run generate-env` (wired to run automatically before `start`/`build` via npm pre-hooks) reads `.env` and writes it into `src/environments/environment.ts` / `environment.prod.ts` as a plain TypeScript object **at build time**. Edit `.env`, then (re)build/serve — the change takes effect on the next build, not instantly in a running dev server.

## 3. Run in development

```bash
npm start
```

This runs `generate-env` first (via the `prestart` hook), then serves at `http://localhost:4200` with live reload, proxying nothing by default — the app calls `API_BASE_URL` directly, so make sure the backend's CORS `CORS_ORIGIN` includes `http://localhost:4200`.

## 4. Log in

Use the credentials seeded by the backend's `npm run db:seed`:
- Admin: `admin@company.com` / `Admin@12345`
- HR: `hr@company.com` / `HrUser@12345`

Or set `AUTH_BYPASS=true` in `.env`, rebuild/re-serve, and skip the login screen entirely (only ever do this locally, and only against a backend also running with `JWT_BYPASS=true`).

## 5. Build for production

```bash
npm run build
```

Output goes to `dist/web/browser/`. This is a static bundle — deploy it behind any static file server or CDN. The provided `Dockerfile` builds this and serves it via nginx with SPA fallback routing (`nginx.conf`).

## 6. Tests

```bash
npm test
```

Runs Jasmine/Karma unit tests in headless Chrome. Requires a Chrome/Chromium binary on the machine or CI runner (e.g. GitHub Actions' `browser-actions/setup-chrome`, or `puppeteer`'s bundled Chromium if you add it as a dev dependency).

## 7. Lint

```bash
npm run lint
```

(Requires `ng add @angular-eslint/schematics` if you haven't already added ESLint to this workspace — the Angular CLI's built-in `ng lint` was removed in v16+ in favor of the ESLint schematic.)

## 8. Run everything via Docker Compose (frontend + backend + MongoDB)

From the repo root:

```bash
docker compose up --build
```

- Frontend: `http://localhost:4200`
- Backend API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/api/docs`

The frontend's `.env` should point `API_BASE_URL` at `http://localhost:3000/api/v1` (the host-exposed port) since the browser — not the container — makes the API calls.

## 9. Environment variable reference

See `.env.example` — every variable is documented inline:

| Variable | Purpose |
|---|---|
| `API_BASE_URL` | Base URL the app calls for all API requests |
| `LOGGING_ENABLED` | Console-logs HTTP errors/auth events when `true` |
| `PRODUCTION` | Mirrors Angular's `environment.production` flag for the dev environment file |
| `PAGINATION_DEFAULT_LIMIT` | Default page size — keep in sync with the backend's `PAGINATION_DEFAULT_LIMIT` |
| `AUTH_TOKEN_STORAGE_KEY` / `AUTH_REFRESH_STORAGE_KEY` | `localStorage` key names for the token pair |
| `AUTH_BYPASS` | Skips login entirely for local dev (forced `false` in production builds regardless of this value) |
| `SEARCH_DEBOUNCE_MS` | Debounce delay before the employee list search fires a request |

## 10. Production notes

- `npm run build` always forces `authBypass: false` in `environment.prod.ts`, regardless of what `.env` says — mirrors the backend's hard block on `JWT_BYPASS` in production.
- Serve over HTTPS in front of the nginx container (terminate TLS at a load balancer/ingress).
- Set `CORS_ORIGIN` on the backend to your real production frontend origin, not `*`.
