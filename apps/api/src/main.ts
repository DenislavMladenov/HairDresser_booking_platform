import 'reflect-metadata';
import { Logger, ValidationPipe, type LogLevel } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { CsrfCookieMiddleware } from './common/security/csrf.middleware';
import { AppConfig } from './config/app-config';

const LOG_LEVELS: LogLevel[] = ['error', 'warn', 'log', 'debug', 'verbose'];

function enabledLogLevels(level: LogLevel): LogLevel[] {
  return LOG_LEVELS.slice(0, LOG_LEVELS.indexOf(level) + 1);
}

async function bootstrap(): Promise<void> {
  // Configuration is validated before Nest starts, so a bad environment fails
  // immediately with a readable message instead of at first use.
  const config = new AppConfig();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: enabledLogLevels(config.logLevel),
  });

  app.setGlobalPrefix('api');

  if (config.trustProxy) {
    // Behind Caddy the client IP arrives in X-Forwarded-For; rate limiting is
    // useless without this.
    app.set('trust proxy', 1);
  }

  app.use(
    helmet({
      // The API only returns JSON, so a restrictive default policy is free.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );

  // The session cookie is signed, so cookie-parser needs the secret.
  app.use(cookieParser(config.sessionSecret));

  const csrfCookie = app.get(CsrfCookieMiddleware);
  app.use((request: Request, response: Response, next: NextFunction) =>
    csrfCookie.use(request, response, next),
  );

  app.enableCors({
    origin: config.allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      // Query and param values are strings; DTOs opt into conversion with
      // @Type so nothing is coerced by accident.
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.enableShutdownHooks();

  if (config.swaggerEnabled) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Barber Booking API')
        .setDescription(
          'Public booking endpoints and the authenticated admin API. Admin endpoints require a session cookie.',
        )
        .setVersion('1.0')
        .addCookieAuth('barber_session')
        .build(),
    );

    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { withCredentials: true },
    });
  }

  await app.listen(config.port, '0.0.0.0');

  const logger = new Logger('Bootstrap');
  logger.log(`API listening on port ${config.port} (${config.nodeEnv})`);
  logger.log(`Business timezone: ${config.timezone}`);

  if (config.swaggerEnabled) {
    logger.warn('Swagger UI is enabled at /api/docs');
  }
}

void bootstrap();
