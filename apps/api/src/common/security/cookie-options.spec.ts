import { AppConfig } from '../../config/app-config';
import {
  clearedSessionCookieOptions,
  csrfCookieOptions,
  sessionCookieOptions,
} from './cookie-options';

/**
 * The Secure flag decides whether a browser will send the session cookie at all,
 * so it has to match how the application is actually reached. Tying it to
 * NODE_ENV once broke deployments served over plain HTTP on a local network:
 * signing in appeared to work and the session vanished on the next request.
 */
function configFor(appUrl: string, nodeEnv = 'production'): AppConfig {
  return new AppConfig({
    NODE_ENV: nodeEnv,
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    APP_URL: appUrl,
    SESSION_SECRET: 'a'.repeat(48),
  });
}

describe('cookie options', () => {
  describe('when served over HTTPS', () => {
    const config = configFor('https://booking.example.com');

    it('marks the session cookie Secure', () => {
      expect(sessionCookieOptions(config, 1000).secure).toBe(true);
      expect(clearedSessionCookieOptions(config).secure).toBe(true);
      expect(csrfCookieOptions(config).secure).toBe(true);
    });
  });

  describe('when served over plain HTTP', () => {
    const config = configFor('http://192.168.1.50');

    it('does not mark cookies Secure, so the browser will still send them', () => {
      expect(sessionCookieOptions(config, 1000).secure).toBe(false);
      expect(clearedSessionCookieOptions(config).secure).toBe(false);
      expect(csrfCookieOptions(config).secure).toBe(false);
    });

    it('still protects the session cookie in every other way', () => {
      const options = sessionCookieOptions(config, 1000);

      expect(options.httpOnly).toBe(true);
      expect(options.signed).toBe(true);
      expect(options.sameSite).toBe('lax');
      expect(options.path).toBe('/');
    });
  });

  it('follows the URL rather than the environment name', () => {
    // Production over HTTP: not Secure, because the browser would drop it.
    expect(sessionCookieOptions(configFor('http://192.168.1.50'), 1000).secure).toBe(false);
    // Development against an HTTPS URL: Secure, because it can be.
    expect(
      sessionCookieOptions(configFor('https://booking.example.com', 'development'), 1000).secure,
    ).toBe(true);
  });

  it('keeps the CSRF cookie readable by JavaScript so the SPA can echo it back', () => {
    expect(csrfCookieOptions(configFor('https://booking.example.com')).httpOnly).toBe(false);
  });
});
