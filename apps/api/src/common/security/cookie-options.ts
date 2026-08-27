import type { CookieOptions, Request } from 'express';

/**
 * SameSite=Lax blocks cross-site POSTs while still allowing normal top-level
 * navigation. Combined with the CSRF token and the same-origin check, that covers
 * the realistic attack surface for this application.
 *
 * The Secure flag follows the protocol of the request being answered, not
 * configuration. It has to: a browser will not send a Secure cookie back to an
 * insecure origin, so marking it Secure on a plain HTTP deployment would discard
 * the session immediately after signing in. Reading it from the request also
 * means one image works over HTTP on a local network and over HTTPS behind a
 * domain, with nothing to set either way.
 *
 * Behind Caddy the protocol arrives in X-Forwarded-Proto, which Express honours
 * because trust proxy is enabled.
 */
function baseCookieOptions(request: Request): CookieOptions {
  return {
    secure: request.secure,
    sameSite: 'lax',
    path: '/',
  };
}

export function sessionCookieOptions(request: Request, maxAgeMs: number): CookieOptions {
  return { ...baseCookieOptions(request), httpOnly: true, signed: true, maxAge: maxAgeMs };
}

export function clearedSessionCookieOptions(request: Request): CookieOptions {
  return { ...baseCookieOptions(request), httpOnly: true, signed: true };
}

/** The CSRF cookie is deliberately readable by JavaScript: the SPA echoes it back in a header. */
export function csrfCookieOptions(request: Request): CookieOptions {
  return { ...baseCookieOptions(request), httpOnly: false };
}
