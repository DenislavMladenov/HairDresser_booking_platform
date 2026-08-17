import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { ApiException } from '../../common/errors/api-exception';
import { readSignedCookie } from '../../common/security/cookies';
import { AppConfig } from '../../config/app-config';
import { SessionService } from '../session.service';

/**
 * Requires a valid, unexpired, unrevoked session cookie. Applied to every admin
 * controller: authorisation is enforced here on the server, never by hiding
 * buttons in the UI.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly sessions: SessionService,
    private readonly config: AppConfig,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = readSessionToken(request, this.config.sessionCookieName);

    if (!token) {
      throw ApiException.unauthorized();
    }

    const user = await this.sessions.validate(token);

    if (!user) {
      throw ApiException.unauthorized('Your session has expired. Please sign in again.');
    }

    request.sessionUser = user;
    return true;
  }
}

/** The session cookie is signed, so cookie-parser exposes it via signedCookies. */
export function readSessionToken(request: Request, cookieName: string): string | null {
  return readSignedCookie(request, cookieName) ?? null;
}
