import { randomBytes } from 'node:crypto';
import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { AppConfig } from '../../config/app-config';
import { csrfCookieOptions } from './cookie-options';
import { readCookie } from './cookies';
import { CSRF_COOKIE_NAME } from './csrf.constants';

/**
 * Issues the double-submit CSRF cookie. Every response carries a token, so any
 * client that has performed at least one request can make a state-changing one.
 */
@Injectable()
export class CsrfCookieMiddleware implements NestMiddleware {
  constructor(private readonly config: AppConfig) {}

  use(request: Request, response: Response, next: NextFunction): void {
    const existing = readCookie(request, CSRF_COOKIE_NAME);

    if (existing !== undefined && existing.length >= 32) {
      request.csrfToken = existing;
      next();
      return;
    }

    const token = randomBytes(32).toString('base64url');
    request.csrfToken = token;
    response.cookie(CSRF_COOKIE_NAME, token, csrfCookieOptions(this.config));
    next();
  }
}
