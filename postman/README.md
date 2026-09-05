# Postman Collection — Employee Management API

Files:
- `Employee-Management-API.postman_collection.json` — all API requests.
- `Employee-Management-API.postman_environment.json` — local environment (`baseUrl`, tokens, ids).

## Import
1. Postman → Import → select both JSON files.
2. Select the **Employee Management API - Local** environment in the top-right environment dropdown.
3. Make sure the API is running locally (`npm run start:dev` in `backend`) and seeded (`SEED_ENABLED=true` by default seeds an admin + hr user + sample employees).

## Endpoints covered (11 total)

### Auth (`/auth`)
| Method | Path | Auth | Roles |
|---|---|---|---|
| POST | `/auth/login` | none | — |
| POST | `/auth/refresh` | refresh token (body) | — |
| POST | `/auth/logout` | Bearer access token | — |

### Employees (`/employees`)
| Method | Path | Auth | Roles |
|---|---|---|---|
| POST | `/employees` | Bearer | admin, hr |
| GET | `/employees` | Bearer | any |
| GET | `/employees/:id` | Bearer | any |
| PUT | `/employees/:id` | Bearer | admin, hr |
| PATCH | `/employees/:id` | Bearer | admin, hr |
| DELETE | `/employees/:id` (soft delete) | Bearer | admin, hr |
| DELETE | `/employees/:id/purge` (hard delete) | Bearer | admin only |

### Health (`/health`)
| Method | Path | Auth |
|---|---|---|
| GET | `/health/live` | none |
| GET | `/health/ready` | none |

## Workflow
1. Run **Auth > Login** (defaults to seeded admin `admin@company.com` / `Admin@12345`). A test script auto-saves `accessToken` / `refreshToken` as collection variables. There's also a **Login (HR account)** request for `hr@company.com` / `HrUser@12345` to test role restrictions.
2. All **Employees** requests inherit collection-level Bearer auth using `{{accessToken}}` — no manual header needed.
3. **Employees > Create Employee** auto-captures the created `_id` into `{{employeeId}}`, reused by Get/Replace/Update/Delete/Purge requests.
4. Use **Auth > Refresh Token** to rotate tokens (reads/writes `{{refreshToken}}` and `{{accessToken}}`); **Auth > Logout** revokes the current refresh token.

## Notes
- Base path is `{{baseUrl}}` = `http://localhost:3000/api/v1` — built from `API_PREFIX` (`api`) + URI versioning (`API_VERSION=v1`). Adjust the environment variable if your `.env` overrides these.
- Global `ValidationPipe` uses `whitelist: true, forbidNonWhitelisted: true` — any extra/unknown body fields will be rejected with 400.
- `employee_id`, `first_name`, `last_name`, `email`, `phone`, `hire_date`, `department`, `job_title`, `salary`, `status`, `address`, `skills` are required on Create/Replace; all optional on Update (PATCH).
- `status` enum: `Active`, `OnLeave`, `Terminated`.
- `manager_id` (optional) and the `:id` path params must be valid Mongo ObjectIds.
- `RBAC_ENABLED=false` turns `RolesGuard` into a no-op (any authenticated user can hit role-gated routes) — useful for local testing without juggling admin/hr accounts.
