import type { CookieOptions } from 'express';
import type { AppConfig } from '../../config/app-config';

/**
 * SameSite=Lax blocks cross-site POSTs while still allowing normal top-level
 * navigation. Combined with the CSRF token and Origin check, that covers the
 * realistic attack surface for this application.
 *
 * The Secure flag follows how the application is actually served rather than
 * NODE_ENV, because a browser will not send a Secure cookie to an insecure
 * origin. See AppConfig.servedOverHttps.
 */
export function sessionCookieOptions(config: AppConfig, maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,
    secure: config.servedOverHttps,
    sameSite: 'lax',
    signed: true,
    path: '/',
    maxAge: maxAgeMs,
  };
}

export function clearedSessionCookieOptions(config: AppConfig): CookieOptions {
  return {
    httpOnly: true,
    secure: config.servedOverHttps,
    sameSite: 'lax',
    signed: true,
    path: '/',
  };
}

/** The CSRF cookie is deliberately readable by JavaScript: the SPA echoes it back in a header. */
export function csrfCookieOptions(config: AppConfig): CookieOptions {
  return {
    httpOnly: false,
    secure: config.servedOverHttps,
    sameSite: 'lax',
    path: '/',
  };
}
