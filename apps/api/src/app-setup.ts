import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { CsrfCookieMiddleware } from './common/security/csrf.middleware';
import type { AppConfig } from './config/app-config';

/**
 * Applies every cross-cutting HTTP concern: security headers, cookie parsing,
 * CSRF token issuing, CORS and input validation.
 *
 * Both the production bootstrap and the integration tests call this, so the
 * behaviour under test is the behaviour that ships. Anything configured only in
 * main.ts would be untested.
 */
export function configureApp(app: NestExpressApplication, config: AppConfig): void {
  app.setGlobalPrefix('api');

  if (config.trustProxy) {
    // Behind Caddy the real client IP arrives in X-Forwarded-For; without this
    // every request looks like it comes from the proxy and rate limiting is
    // meaningless.
    app.set('trust proxy', 1);
  }

  app.use(
    helmet({
      // The API only ever returns JSON, so a content policy adds nothing here.
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
      // Query and path values are strings; DTOs opt into conversion with @Type
      // so nothing is silently coerced.
      transformOptions: { enableImplicitConversion: false },
    }),
  );
}
