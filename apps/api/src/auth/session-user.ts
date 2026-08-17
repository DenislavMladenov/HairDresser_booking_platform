import type { Role } from '@booking/shared';

/** The authenticated principal attached to a request by the session guard. */
export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  sessionId: string;
}
