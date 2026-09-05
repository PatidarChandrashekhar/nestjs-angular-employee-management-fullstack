# Employee Management API — Backend

Production-ready NestJS + MongoDB backend for the Employee Management System.
See `../ARCHITECTURE.md` (repo root, added once the frontend is generated) for
system diagrams and endpoint flows.

## 1. Prerequisites

| Tool | Version |
|---|---|
| Node.js | 20.x LTS |
| npm | 10.x (bundled with Node 20) |
| MongoDB | 7.x — either installed locally or via Docker |
| Docker + Docker Compose | optional but recommended for local Mongo |

## 2. First-time setup

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and review every value — in particular:
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — replace the placeholder values with real random secrets (`openssl rand -hex 32`).
- `MONGODB_URI` / `MONGODB_DB_NAME` — defaults to `mongodb://localhost:27017` / `employee-nestjs-api`.
- Every `*_ENABLED` flag defaults to a sensible development setting — flip any of them to `false` to disable that feature entirely (see the table in `.env.example` for what each one controls).

## 3. Start MongoDB

**Option A — Docker (recommended):**
```bash
# from the repo root (one level up from backend/)
docker compose up -d mongo
```

**Option B — local install:** start your local `mongod` service and make sure `MONGODB_URI` in `.env` points at it.

## 4. Seed the database

Populates 50 employee records (with a realistic manager hierarchy) plus one `admin` and one `hr` login, into the `employee-nestjs-api` database.

```bash
npm run db:seed          # skips automatically if data already exists
npm run db:seed:force    # clears employees + users first, then reseeds
```

Seeded credentials (override via `.env` before seeding if you want different ones):
- Admin: `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (default `admin@company.com` / `Admin@12345`)
- HR: `SEED_HR_EMAIL` / `SEED_HR_PASSWORD` (default `hr@company.com` / `HrUser@12345`)

## 5. Run the API

```bash
npm run start:dev     # watch mode, for local development
# or
npm run build && npm run start:prod   # compiled, production-style run
```

The API listens on `http://localhost:3000` by default (`PORT` in `.env`), under the prefix `/api/v1` (`API_PREFIX` / `API_VERSION`).

- Swagger UI (if `SWAGGER_ENABLED=true`): `http://localhost:3000/api/docs`
- Liveness: `GET /api/v1/health/live`
- Readiness: `GET /api/v1/health/ready`

## 6. Try it

```bash
# Log in with the seeded admin account
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"Admin@12345"}'

# Use the returned accessToken to list employees (page 1, 10 per page)
curl http://localhost:3000/api/v1/employees \
  -H "Authorization: Bearer <accessToken>"
```

> Tip: for quick local exploration without dealing with tokens at all, set `JWT_BYPASS=true` in `.env` and restart — every request will be treated as an authenticated admin. **Never do this outside your own machine**; the app refuses to boot with this flag on when `NODE_ENV=production`.

## 7. Tests

```bash
npm run test          # unit tests
npm run test:cov      # unit tests with coverage
npm run test:e2e      # e2e tests against an in-memory Mongo instance
```

## 8. Lint & format

```bash
npm run lint
npm run format
```

## 9. Run everything via Docker Compose (API + MongoDB)

```bash
# from the repo root
docker compose up --build
```

This builds the API's production image (multi-stage `Dockerfile`), starts MongoDB with a persistent named volume, waits for Mongo's healthcheck before starting the API, and exposes the API on `http://localhost:3000`. Run the seed script separately afterward (`npm run db:seed` from your host, pointed at `mongodb://localhost:27017`, or `docker compose exec api npm run db:seed`).

## 10. Environment variable reference

See `.env.example` — every variable is documented inline, grouped by concern (app, database, JWT/auth, RBAC, logging, Swagger, throttling, CORS, pagination, health, seed). All of them are validated at boot via `src/config/env.validation.ts`; the app will refuse to start rather than run with an invalid/missing value.

## 11. Production notes

- Set `NODE_ENV=production`. This alone forces `JWT_BYPASS=false` (enforced, not just recommended).
- Put real secrets in your platform's secret manager (Docker/Kubernetes secrets, AWS Parameter Store, etc.) rather than a committed `.env` file — `.env` is for local development only.
- Consider setting `SWAGGER_ENABLED=false` (or gating `/api/docs` behind auth at your reverse proxy) in production.
- Run `npm run build` and deploy the `dist/` output with `node dist/main.js`, or use the provided multi-stage `Dockerfile`.
