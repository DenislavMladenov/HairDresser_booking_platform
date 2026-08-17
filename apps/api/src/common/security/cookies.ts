import type { Request } from 'express';

/**
 * Express types both cookie bags as `any`. Reading them through these helpers
 * keeps that `any` from spreading into the rest of the codebase and guarantees
 * callers get a string or nothing.
 */

function readFrom(bag: unknown, name: string): string | undefined {
  if (typeof bag !== 'object' || bag === null) {
    return undefined;
  }

  const value = (bag as Record<string, unknown>)[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function readCookie(request: Request, name: string): string | undefined {
  return readFrom(request.cookies, name);
}

/**
 * Signed cookies are exposed separately by cookie-parser, and only after the
 * signature has been verified. A tampered value never appears here.
 */
export function readSignedCookie(request: Request, name: string): string | undefined {
  return readFrom(request.signedCookies, name);
}
