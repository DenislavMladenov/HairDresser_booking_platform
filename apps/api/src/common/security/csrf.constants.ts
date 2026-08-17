export const CSRF_COOKIE_NAME = 'csrf_token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

/** Methods that cannot change state and therefore need no CSRF token. */
export const CSRF_SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
