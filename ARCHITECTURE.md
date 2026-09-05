# Employee Management System — Architecture & Endpoint Flows

> Rendered natively by GitHub, GitLab, and most Markdown viewers. If your viewer doesn't support Mermaid, paste any block into https://mermaid.live.

## 1. System architecture

```mermaid
flowchart TB
    subgraph Client["Client"]
        Browser["Angular SPA<br/>(Signals, standalone components)"]
    end

    subgraph Backend["NestJS Backend (apps/api)"]
        direction TB
        MW["Global middleware<br/>helmet · CORS · body-limit · correlation-id"]
        Guards["Guards<br/>JwtAuthGuard (JWT_BYPASS aware) · RolesGuard (RBAC_ENABLED aware) · ThrottlerGuard"]
        Filters["Global filters<br/>HttpExceptionFilter · MongoExceptionFilter"]
        Serializer["ClassSerializerInterceptor<br/>(strips password/refreshToken hashes)"]

        subgraph AuthMod["Auth module"]
            AuthCtrl["AuthController<br/>/auth/login /auth/refresh /auth/logout"]
            AuthSvc["AuthService<br/>bcrypt + JWT sign/verify"]
        end

        subgraph EmpMod["Employees module"]
            EmpCtrl["EmployeesController<br/>/employees CRUD"]
            EmpSvc["EmployeesService<br/>pagination · soft delete · audit trail"]
            CycleValidator["NoManagerCycleValidator"]
        end

        subgraph HealthMod["Health module"]
            HealthCtrl["HealthController<br/>/health/live /health/ready"]
        end

        Config["ConfigModule<br/>Joi-validated .env → typed config"]
        Logger["nestjs-pino Logger<br/>(silenced when LOGGING_ENABLED=false)"]
    end

    DB[("MongoDB<br/>employee-nestjs-api")]
    Seed["seed.ts<br/>(idempotent, 50 records + admin/hr users)"]

    Browser -- "HTTPS / REST + JWT Bearer" --> MW
    MW --> Guards --> AuthCtrl
    MW --> Guards --> EmpCtrl
    MW --> HealthCtrl
    AuthCtrl --> AuthSvc --> DB
    EmpCtrl --> EmpSvc --> CycleValidator
    EmpSvc --> DB
    HealthCtrl -.ping.-> DB
    Config -.-> Guards
    Config -.-> Logger
    Config -.-> EmpSvc
    Filters -.wraps.-> EmpCtrl
    Filters -.wraps.-> AuthCtrl
    Serializer -.wraps.-> AuthCtrl
    Seed --> DB
```

## 2. Login → protected request flow

```mermaid
sequenceDiagram
    autonumber
    participant U as Angular App
    participant A as AuthController
    participant S as AuthService
    participant DB as MongoDB (users)
    participant E as EmployeesController

    U->>A: POST /auth/login {email, password}
    A->>S: validateCredentials()
    S->>DB: findOne({email})
    DB-->>S: user document (passwordHash)
    S->>S: bcrypt.compare(password, passwordHash)
    alt credentials valid
        S->>S: sign accessToken (15m) + refreshToken (7d)
        S->>DB: save bcrypt hash of refreshToken
        S-->>A: {accessToken, refreshToken}
        A-->>U: 200 OK
        U->>E: GET /employees (Authorization: Bearer accessToken)
        E->>E: JwtAuthGuard verifies token (or bypasses if JWT_BYPASS=true)
        E->>E: RolesGuard checks required role (or no-op if RBAC_ENABLED=false)
        E-->>U: 200 OK { data, total, page, limit }
    else credentials invalid
        S-->>A: throw UnauthorizedException
        A-->>U: 401 Unauthorized
    end
```

## 3. Employee creation flow (with manager-cycle guard)

```mermaid
sequenceDiagram
    autonumber
    participant U as Client
    participant C as EmployeesController
    participant V as ValidationPipe (DTO)
    participant Val as NoManagerCycleValidator
    participant S as EmployeesService
    participant DB as MongoDB (employees)

    U->>C: POST /employees {..., manager_id?}
    C->>V: validate CreateEmployeeDto
    alt DTO invalid
        V-->>U: 400 Bad Request (field errors)
    else DTO valid
        C->>S: create(dto, actorEmail)
        alt manager_id provided
            S->>Val: assertValid(manager_id)
            Val->>DB: findOne(manager, deleted_at: null)
            alt manager missing/deleted
                Val-->>U: 400 Bad Request
            else manager exists
                Val-->>S: ok (self-reference structurally impossible on create)
            end
        end
        S->>DB: insert document (with audit_trail entry)
        alt duplicate employee_id/email
            DB-->>S: MongoServerError code 11000
            S-->>U: 409 Conflict (via MongoExceptionFilter)
        else success
            DB-->>S: created document
            S-->>U: 201 Created
        end
    end
```

## 4. Paginated list flow

```mermaid
flowchart LR
    Req["GET /employees?page=&limit=&search=&department=&status="] --> DTO["QueryEmployeesDto<br/>(all fields optional)"]
    DTO --> Cfg{"page/limit provided?"}
    Cfg -- "no" --> Defaults["Apply PAGINATION_DEFAULT_PAGE /<br/>PAGINATION_DEFAULT_LIMIT from .env"]
    Cfg -- "yes" --> Cap["Cap limit at PAGINATION_MAX_LIMIT"]
    Defaults --> Filter
    Cap --> Filter
    Filter["Build Mongo filter<br/>deleted_at: null (unless admin + includeDeleted=true)<br/>+ department/status/$text search"] --> Query["find().sort().skip().limit().populate(manager_id)"]
    Query --> Count["countDocuments(filter)"]
    Query --> Resp
    Count --> Resp
    Resp["{ data, total, page, limit, totalPages }"] --> Client["Angular resource()<br/>renders grid + pagination"]
```

## 5. Soft delete vs. hard delete

```mermaid
flowchart TD
    A["DELETE /employees/:id"] -->|"role: admin or hr"| B["Soft delete:<br/>status = 'Terminated'<br/>deleted_at = now()<br/>audit_trail entry appended"]
    C["DELETE /employees/:id/purge"] -->|"role: admin only"| D["Hard delete:<br/>document permanently removed"]
    B --> E["Record excluded from default<br/>GET /employees results"]
    B --> F["Record still recoverable /<br/>auditable by admins (includeDeleted=true)"]
    D --> G["Irreversible — no audit trail possible afterward"]
```

## 7. Frontend route & lazy-loading structure

```mermaid
flowchart TB
    Root["AppComponent<br/>(RouterOutlet + ToastContainer)"] --> Routes{"app.routes.ts"}

    Routes -->|"/login"| Login["LoginComponent<br/>(lazy chunk)"]
    Routes -->|"/employees<br/>[authGuard]"| List["EmployeeListComponent<br/>(lazy chunk)"]
    Routes -->|"/employees/new<br/>[authGuard, roleGuard(admin,hr)]"| DetailNew["EmployeeDetailComponent<br/>(lazy chunk, create mode)"]
    Routes -->|"/employees/:id<br/>[authGuard]"| DetailEdit["EmployeeDetailComponent<br/>(lazy chunk, view/edit mode)"]
    Routes -->|"**"| Redirect["redirect → /employees"]

    List -->|"@defer (on viewport)"| Grid["Employee grid + pagination<br/>(code-split at build, deferred at render)"]
    List --> EmpSvc["EmployeeService"]
    DetailNew --> EmpSvc
    DetailEdit --> EmpSvc
    Login --> AuthSvc["AuthService (signals)"]

    EmpSvc -- HttpClient --> Interceptors["authTokenInterceptor → errorInterceptor"]
    AuthSvc -- HttpClient --> Interceptors
    Interceptors --> API[("Backend API<br/>/api/v1/...")]
```

## 8. Frontend HTTP request lifecycle (interceptor chain)

```mermaid
sequenceDiagram
    autonumber
    participant C as Component (e.g. EmployeeListComponent)
    participant Auth as authTokenInterceptor
    participant Err as errorInterceptor
    participant API as Backend API
    participant AS as AuthService

    C->>Auth: HttpClient request
    Auth->>Auth: read access token from localStorage
    Auth->>Err: attach Authorization header (unless /auth/login or /auth/refresh)
    Err->>API: forward request
    alt 2xx response
        API-->>Err: success
        Err-->>C: response passed through
    else 401 Unauthorized (non-auth endpoint)
        API-->>Err: 401
        Err->>AS: refresh() [one attempt only]
        AS->>API: POST /auth/refresh
        alt refresh succeeds
            API-->>AS: new token pair
            AS->>AS: store new tokens
            Err->>API: retry original request with new token
            API-->>C: response
        else refresh fails
            AS->>AS: logout() — clear localStorage
            Err->>C: navigate to /login
        end
    else other error (4xx/5xx)
        API-->>Err: error body
        Err->>Err: show toast with server message
        Err-->>C: error propagated
    end
```

## 9. `.env` → build-time configuration pipeline (frontend)

```mermaid
flowchart LR
    EnvFile[".env<br/>(API_BASE_URL, AUTH_BYPASS, LOGGING_ENABLED,<br/>PAGINATION_DEFAULT_LIMIT, ...)"]
    Script["scripts/generate-env.js<br/>(runs via npm pre-hooks:<br/>prestart / prebuild)"]
    Dev["src/environments/environment.ts<br/>(used by `ng serve` / dev build)"]
    Prod["src/environments/environment.prod.ts<br/>(used by `ng build --configuration production`;<br/>AUTH_BYPASS forced false)"]
    Bundle["Compiled JS bundle<br/>(fileReplacements swaps environment.ts → environment.prod.ts)"]

    EnvFile --> Script
    Script --> Dev
    Script --> Prod
    Dev -->|dev config| Bundle
    Prod -->|prod config| Bundle
```

## 10. Full-stack login → list employees (end-to-end)

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant FE as Angular SPA
    participant BE as NestJS API
    participant DB as MongoDB

    User->>FE: enters email + password, submits LoginComponent
    FE->>BE: POST /auth/login
    BE->>DB: findOne(user), bcrypt.compare
    DB-->>BE: match
    BE-->>FE: { accessToken, refreshToken }
    FE->>FE: decode JWT → signals (isAuthenticated, roles)
    FE->>FE: router.navigateByUrl('/employees')
    FE->>FE: lazy-load EmployeeListComponent chunk
    FE->>BE: GET /employees?page=1&limit=10 (Authorization: Bearer ...)
    BE->>BE: JwtAuthGuard verifies token
    BE->>BE: RolesGuard (no @Roles on GET → passes)
    BE->>DB: find(deleted_at: null).skip().limit().populate(manager_id)
    DB-->>BE: 10 employee documents + count
    BE-->>FE: { data, total, page, limit, totalPages }
    FE->>FE: render table + pagination inside @defer block
    FE-->>User: employee grid visible
```

## 11. Backend request-level toggle matrix

```mermaid
    ENV --> RB["RBAC_ENABLED"]
    ENV --> LG["LOGGING_ENABLED"]
    ENV --> SW["SWAGGER_ENABLED"]
    ENV --> TH["THROTTLE_ENABLED"]
    ENV --> CO["CORS_ENABLED"]

    JB -->|true| J1["JwtAuthGuard injects a fake admin user,<br/>skips real token verification<br/>(blocked automatically in production)"]
    JB -->|false| J2["Standard Passport JWT verification"]

    RB -->|false| R1["RolesGuard is a no-op —<br/>any authenticated user passes"]
    RB -->|true| R2["RolesGuard enforces @Roles(...) per route"]

    LG -->|false| L1["pino logger level = silent"]
    LG -->|true| L2["Structured JSON logs with<br/>correlation IDs + redaction"]

    SW -->|false| S1["/api/docs not mounted"]
    SW -->|true| S2["Swagger UI served at SWAGGER_PATH"]

    TH -->|false| T1["Throttler limit effectively unlimited"]
    TH -->|true| T2["THROTTLE_LIMIT per THROTTLE_TTL enforced<br/>(tighter limits on /auth/*)"]
```

## 12. Frontend toggle matrix

```mermaid
flowchart LR
    FENV[".env (frontend)"] --> FAB["AUTH_BYPASS"]
    FENV --> FLG["LOGGING_ENABLED"]
    FENV --> FPG["PAGINATION_DEFAULT_LIMIT"]

    FAB -->|"true (dev only,<br/>forced false in prod build)"| FA1["AuthService seeds a fake admin<br/>signal on startup — no login screen"]
    FAB -->|false| FA2["Normal login flow via /auth/login"]

    FLG -->|true| FL1["HTTP errors logged to browser console"]
    FLG -->|false| FL2["Silent — only user-facing toasts shown"]

    FPG --> FP1["EmployeeService.list() default `limit`<br/>when the caller doesn't specify one"]
```
