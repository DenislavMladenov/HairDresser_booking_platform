import type { SessionUser } from '../auth/session-user';

declare global {
  namespace Express {
    interface Request {
      /** Double-submit CSRF token for the current request. */
      csrfToken?: string;
      /** Set by SessionGuard once a valid session cookie has been verified. */
      sessionUser?: SessionUser;
    }
  }
}
