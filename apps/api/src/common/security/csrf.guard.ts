import { timingSafeEqual } from 'node:crypto';
import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { AppConfig } from '../../config/app-config';
import { ApiException } from '../errors/api-exception';
import { readCookie } from './cookies';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, CSRF_SAFE_METHODS } from './csrf.constants';

/**
 * Two independent checks for every state-changing request:
 *
 *  1. The Origin (or Referer) header must match an allowed origin. A browser
 *     sets this itself and a page on another site cannot forge it.
 *  2. A double-submit token: the value in the readable CSRF cookie must match
 *     the value echoed in the request header. A cross-site attacker can cause
 *     the cookie to be sent but cannot read it to build the header.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly logger = new Logger(CsrfGuard.name);

  constructor(private readonly config: AppConfig) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    if (CSRF_SAFE_METHODS.has(request.method.toUpperCase())) {
      return true;
    }

    this.assertTrustedOrigin(request);
    this.assertMatchingToken(request);

    return true;
  }

  private assertTrustedOrigin(request: Request): void {
    const origin = request.headers.origin ?? this.originFromReferer(request.headers.referer);

    // Non-browser clients (curl, integration tests, server-to-server) send no
    // Origin at all. They are not subject to CSRF, which requires a browser.
    if (!origin) {
      return;
    }

    if (!this.config.allowedOrigins.includes(origin)) {
      this.logger.warn(`Rejected ${request.method} from disallowed origin`);
      throw ApiException.csrfFailed('Request origin is not allowed.');
    }
  }

  private assertMatchingToken(request: Request): void {
    const cookieToken = readCookie(request, CSRF_COOKIE_NAME);
    const headerValue = request.headers[CSRF_HEADER_NAME];
    const headerToken = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    if (typeof cookieToken !== 'string' || typeof headerToken !== 'string') {
      throw ApiException.csrfFailed('Missing CSRF token. Please reload the page and try again.');
    }

    const cookieBuffer = Buffer.from(cookieToken);
    const headerBuffer = Buffer.from(headerToken);

    if (
      cookieBuffer.length !== headerBuffer.length ||
      !timingSafeEqual(cookieBuffer, headerBuffer)
    ) {
      throw ApiException.csrfFailed('Invalid CSRF token. Please reload the page and try again.');
    }
  }

  private originFromReferer(referer: string | undefined): string | undefined {
    if (!referer) {
      return undefined;
    }

    try {
      return new URL(referer).origin;
    } catch {
      return undefined;
    }
  }
}
