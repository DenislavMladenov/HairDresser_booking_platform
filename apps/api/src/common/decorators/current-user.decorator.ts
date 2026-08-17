import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';
import type { SessionUser } from '../../auth/session-user';
import { ApiException } from '../errors/api-exception';

/**
 * Injects the authenticated user. Only usable on routes protected by
 * SessionGuard, which is why a missing user is treated as a programming error.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SessionUser => {
    const request = context.switchToHttp().getRequest<Request>();

    if (!request.sessionUser) {
      throw ApiException.unauthorized();
    }

    return request.sessionUser;
  },
);
