import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@booking/shared';
import type { Request } from 'express';
import { ROLES_METADATA_KEY } from '../../common/decorators/roles.decorator';
import { ApiException } from '../../common/errors/api-exception';

/**
 * Checks the role recorded on the session. Runs after SessionGuard, which is
 * what puts the user on the request.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.sessionUser;

    if (!user) {
      throw ApiException.unauthorized();
    }

    if (!requiredRoles.includes(user.role)) {
      throw ApiException.forbidden();
    }

    return true;
  }
}
