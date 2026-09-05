import * as Joi from 'joi';

/**
 * Every environment variable the app depends on is declared here. Nest's
 * ConfigModule runs this schema at bootstrap and throws (refusing to start)
 * if anything is missing or malformed — we never want a misconfigured app
 * limping along in an undefined state.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default('api'),
  API_VERSION: Joi.string().default('v1'),
  APP_URL: Joi.string().uri().default('http://localhost:3000'),

  MONGODB_URI: Joi.string().uri().required(),
  MONGODB_DB_NAME: Joi.string().required(),
  MONGODB_MAX_POOL_SIZE: Joi.number().default(20),
  MONGODB_MIN_POOL_SIZE: Joi.number().default(2),
  MONGODB_SERVER_SELECTION_TIMEOUT_MS: Joi.number().default(5000),

  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  JWT_BYPASS: Joi.boolean().default(false),

  RBAC_ENABLED: Joi.boolean().default(true),

  LOGGING_ENABLED: Joi.boolean().default(true),
  LOG_LEVEL: Joi.string().valid('trace', 'debug', 'info', 'warn', 'error', 'fatal').default('info'),
  LOG_PRETTY: Joi.boolean().default(true),
  LOG_REDACT_FIELDS: Joi.string().default('req.headers.authorization,password,refreshToken,salary'),

  SWAGGER_ENABLED: Joi.boolean().default(true),
  SWAGGER_PATH: Joi.string().default('api/docs'),

  THROTTLE_ENABLED: Joi.boolean().default(true),
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(100),
  AUTH_THROTTLE_TTL: Joi.number().default(60),
  AUTH_THROTTLE_LIMIT: Joi.number().default(5),

  CORS_ENABLED: Joi.boolean().default(true),
  CORS_ORIGIN: Joi.string().default('http://localhost:4200'),
  CORS_CREDENTIALS: Joi.boolean().default(true),

  MAX_REQUEST_BODY_SIZE: Joi.string().default('1mb'),

  PAGINATION_DEFAULT_PAGE: Joi.number().default(1),
  PAGINATION_DEFAULT_LIMIT: Joi.number().default(10),
  PAGINATION_MAX_LIMIT: Joi.number().default(100),

  HEALTH_ENABLED: Joi.boolean().default(true),

  SEED_ENABLED: Joi.boolean().default(true),
  SEED_EMPLOYEE_COUNT: Joi.number().default(50),
  SEED_FORCE: Joi.boolean().default(false),
  SEED_ADMIN_EMAIL: Joi.string().email().default('admin@company.com'),
  SEED_ADMIN_PASSWORD: Joi.string().min(8).default('Admin@12345'),
  SEED_HR_EMAIL: Joi.string().email().default('hr@company.com'),
  SEED_HR_PASSWORD: Joi.string().min(8).default('HrUser@12345'),
})
  // Hard safety net: never allow the most dangerous dev-only toggle to reach production.
  .custom((value, helpers) => {
    if (value.NODE_ENV === 'production' && value.JWT_BYPASS === true) {
      return helpers.error('any.invalid');
    }
    return value;
  }, 'JWT_BYPASS must be false when NODE_ENV=production')
  .messages({
    'any.invalid': 'JWT_BYPASS=true is not allowed when NODE_ENV=production. Refusing to boot.',
  });
