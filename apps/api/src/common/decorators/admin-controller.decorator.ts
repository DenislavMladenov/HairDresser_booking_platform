import { applyDecorators, Controller, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@booking/shared';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { SessionGuard } from '../../auth/guards/session.guard';
import { RequireRoles } from './roles.decorator';

/**
 * Every admin controller is declared with this decorator, so authentication and
 * the ADMIN role requirement cannot be forgotten on a new endpoint.
 */
export function AdminController(path: string): ClassDecorator {
  return applyDecorators(
    Controller(path),
    UseGuards(SessionGuard, RolesGuard),
    RequireRoles(Role.ADMIN),
    ApiTags('admin'),
    ApiCookieAuth(),
    ApiUnauthorizedResponse({ description: 'No valid session' }),
    ApiForbiddenResponse({ description: 'Session lacks the required role' }),
  );
}
