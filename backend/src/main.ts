import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json } from 'express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);

  app.useLogger(app.get(Logger));

  app.use(helmet());
  app.use(json({ limit: config.get<string>('bodyLimit') }));

  if (config.get<boolean>('cors.enabled')) {
    app.enableCors({
      origin: config.get<string[]>('cors.origin'),
      credentials: config.get<boolean>('cors.credentials'),
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
    });
  }

  app.setGlobalPrefix(config.get<string>('app.apiPrefix') as string);
  // `app.apiVersion` (API_VERSION) already includes the leading "v" (e.g. "v1").
  // Nest's URI versioning prepends its own "v" prefix by default, so without
  // `prefix: ''` this would double up into "/api/vv1/...".
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: config.get<string>('app.apiVersion'),
    prefix: '',
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  if (config.get<boolean>('swagger.enabled')) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Employee Management API')
      .setDescription('Production-ready Employee Management System API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(config.get<string>('swagger.path') as string, app, document);
  }

  app.enableShutdownHooks();

  const port = config.get<number>('app.port') as number;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Employee Management API listening on port ${port}`);
}

bootstrap();
