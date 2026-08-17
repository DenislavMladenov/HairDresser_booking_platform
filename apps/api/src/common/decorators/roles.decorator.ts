import { SetMetadata } from '@nestjs/common';
import type { Role } from '@booking/shared';

export const ROLES_METADATA_KEY = 'booking:required-roles';

export const RequireRoles = (...roles: Role[]) => SetMetadata(ROLES_METADATA_KEY, roles);
