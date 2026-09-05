import { randomUUID } from 'crypto';
import { IncomingMessage } from 'http';
import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { MongoExceptionFilter } from './common/filters/mongo-exception.filter';
import { AuthModule } from './auth/auth.module';
import { EmployeesModule } from './employees/employees.module';
import { HealthModule } from './health/health.module';

const healthEnabled = process.env.HEALTH_ENABLED !== 'false';
const throttleEnabled = process.env.THROTTLE_ENABLED !== 'false';
const loggingEnabled = process.env.LOGGING_ENABLED !== 'false';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),

    // Structured logging. When LOGGING_ENABLED=false, pino is set to the
    // `silent` level so request logging is effectively a no-op without
    // ripping the module (and its request-id plumbing) out entirely.
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: loggingEnabled ? config.get<string>('logging.level') : 'silent',
          genReqId: (req: IncomingMessage) =>
            (req.headers['x-correlation-id'] as string) ?? randomUUID(),
          redact: config.get<string[]>('logging.redactFields'),
          transport:
            loggingEnabled && config.get<boolean>('logging.pretty')
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
        },
      }),
    }),

    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('database.uri'),
        dbName: config.get<string>('database.dbName'),
        maxPoolSize: config.get<number>('database.maxPoolSize'),
        minPoolSize: config.get<number>('database.minPoolSize'),
        serverSelectionTimeoutMS: config.get<number>('database.serverSelectionTimeoutMS'),
      }),
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: (config.get<number>('throttle.ttl') ?? 60) * 1000,
            // When THROTTLE_ENABLED=false, set an effectively unlimited ceiling
            // rather than removing the guard, so behavior stays predictable.
            limit: throttleEnabled ? (config.get<number>('throttle.limit') ?? 100) : 1_000_000,
          },
        ],
      }),
    }),

    AuthModule,
    EmployeesModule,
    ...(healthEnabled ? [HealthModule] : []),
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Nest reverses this array before matching an exception against each
    // filter's @Catch() types, so the *last* entry here is actually tried
    // *first*. MongoExceptionFilter is scoped to specific error types and
    // must get first look; HttpExceptionFilter is a catch-all (@Catch()
    // with no args) and would otherwise always win and swallow Mongo
    // errors as generic 500s before MongoExceptionFilter ever saw them.
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_FILTER, useClass: MongoExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor },
  ],
})
export class AppModule {}
