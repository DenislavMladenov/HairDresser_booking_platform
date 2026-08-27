import type { Request } from 'express';
import {
  clearedSessionCookieOptions,
  csrfCookieOptions,
  sessionCookieOptions,
} from './cookie-options';

/**
 * The Secure flag decides whether a browser will send the session cookie back at
 * all, so it has to match the protocol actually in use. Tying it to configuration
 * once broke deployments served over plain HTTP: signing in appeared to work and
 * the session vanished on the very next request.
 */
function requestOver(protocol: 'http' | 'https'): Request {
  return { secure: protocol === 'https' } as Request;
}

describe('cookie options', () => {
  describe('over HTTPS', () => {
    const request = requestOver('https');

    it('marks every cookie Secure', () => {
      expect(sessionCookieOptions(request, 1000).secure).toBe(true);
      expect(clearedSessionCookieOptions(request).secure).toBe(true);
      expect(csrfCookieOptions(request).secure).toBe(true);
    });
  });

  describe('over plain HTTP', () => {
    const request = requestOver('http');

    it('leaves cookies unmarked, so the browser still sends them', () => {
      expect(sessionCookieOptions(request, 1000).secure).toBe(false);
      expect(clearedSessionCookieOptions(request).secure).toBe(false);
      expect(csrfCookieOptions(request).secure).toBe(false);
    });

    it('still protects the session cookie every other way', () => {
      const options = sessionCookieOptions(request, 1000);

      expect(options.httpOnly).toBe(true);
      expect(options.signed).toBe(true);
      expect(options.sameSite).toBe('lax');
      expect(options.path).toBe('/');
    });
  });

  it('decides per request, so one deployment can serve both', () => {
    expect(sessionCookieOptions(requestOver('https'), 1000).secure).toBe(true);
    expect(sessionCookieOptions(requestOver('http'), 1000).secure).toBe(false);
  });

  it('carries the session lifetime and clears without one', () => {
    expect(sessionCookieOptions(requestOver('https'), 60_000).maxAge).toBe(60_000);
    expect(clearedSessionCookieOptions(requestOver('https')).maxAge).toBeUndefined();
  });

  it('keeps the CSRF cookie readable by JavaScript so the SPA can echo it back', () => {
    expect(csrfCookieOptions(requestOver('https')).httpOnly).toBe(false);
  });
});
