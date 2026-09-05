/**
 * Typed, grouped view over process.env, consumed via ConfigService.get('key').
 * Keeping this as a single factory means every other module reads config
 * through one typed surface instead of touching process.env directly.
 */
export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV,
    port: parseInt(process.env.PORT ?? '3000', 10),
    apiPrefix: process.env.API_PREFIX ?? 'api',
    apiVersion: process.env.API_VERSION ?? 'v1',
    appUrl: process.env.APP_URL,
  },
  database: {
    uri: process.env.MONGODB_URI,
    dbName: process.env.MONGODB_DB_NAME,
    maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE ?? '20', 10),
    minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE ?? '2', 10),
    serverSelectionTimeoutMS: parseInt(
      process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS ?? '5000',
      10,
    ),
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    bypass: process.env.JWT_BYPASS === 'true',
  },
  rbac: {
    enabled: process.env.RBAC_ENABLED !== 'false',
  },
  logging: {
    enabled: process.env.LOGGING_ENABLED !== 'false',
    level: process.env.LOG_LEVEL ?? 'info',
    pretty: process.env.LOG_PRETTY !== 'false',
    redactFields: (process.env.LOG_REDACT_FIELDS ?? '').split(',').filter(Boolean),
  },
  swagger: {
    enabled: process.env.SWAGGER_ENABLED !== 'false',
    path: process.env.SWAGGER_PATH ?? 'api/docs',
  },
  throttle: {
    enabled: process.env.THROTTLE_ENABLED !== 'false',
    ttl: parseInt(process.env.THROTTLE_TTL ?? '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
    authTtl: parseInt(process.env.AUTH_THROTTLE_TTL ?? '60', 10),
    authLimit: parseInt(process.env.AUTH_THROTTLE_LIMIT ?? '5', 10),
  },
  cors: {
    enabled: process.env.CORS_ENABLED !== 'false',
    origin: (process.env.CORS_ORIGIN ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    credentials: process.env.CORS_CREDENTIALS !== 'false',
  },
  bodyLimit: process.env.MAX_REQUEST_BODY_SIZE ?? '1mb',
  pagination: {
    defaultPage: parseInt(process.env.PAGINATION_DEFAULT_PAGE ?? '1', 10),
    defaultLimit: parseInt(process.env.PAGINATION_DEFAULT_LIMIT ?? '10', 10),
    maxLimit: parseInt(process.env.PAGINATION_MAX_LIMIT ?? '100', 10),
  },
  health: {
    enabled: process.env.HEALTH_ENABLED !== 'false',
  },
  seed: {
    enabled: process.env.SEED_ENABLED !== 'false',
    employeeCount: parseInt(process.env.SEED_EMPLOYEE_COUNT ?? '50', 10),
    force: process.env.SEED_FORCE === 'true',
    adminEmail: process.env.SEED_ADMIN_EMAIL ?? 'admin@company.com',
    adminPassword: process.env.SEED_ADMIN_PASSWORD ?? 'Admin@12345',
    hrEmail: process.env.SEED_HR_EMAIL ?? 'hr@company.com',
    hrPassword: process.env.SEED_HR_PASSWORD ?? 'HrUser@12345',
  },
});
