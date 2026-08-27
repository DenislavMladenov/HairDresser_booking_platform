import 'reflect-metadata';
import { Logger, type LogLevel } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app-setup';
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

  configureApp(app, config);
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
        .addCookieAuth(config.sessionCookieName)
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

  if (!config.servedOverHttps) {
    // Legitimate for a deployment reachable only on a local network, but the
    // consequence should never be a surprise.
    logger.warn(
      `APP_URL is ${config.appUrl}, so cookies are not marked Secure and traffic is not encrypted. Expected only for local or local-network access.`,
    );
  }

  if (config.swaggerEnabled) {
    logger.warn('Swagger UI is enabled at /api/docs');
  }
}

void bootstrap();
