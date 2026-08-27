import { Injectable } from '@nestjs/common';
import { validateEnv, type Env } from './env';

/**
 * Typed, read-only view of the validated environment. Everything else in the
 * application depends on this rather than touching process.env directly.
 */
@Injectable()
export class AppConfig {
  private readonly env: Env;

  constructor(raw: Record<string, unknown> = process.env) {
    this.env = validateEnv(raw);
  }

  get nodeEnv(): Env['NODE_ENV'] {
    return this.env.NODE_ENV;
  }

  get isProduction(): boolean {
    return this.env.NODE_ENV === 'production';
  }

  get isTest(): boolean {
    return this.env.NODE_ENV === 'test';
  }

  get port(): number {
    return this.env.API_PORT;
  }

  get logLevel(): Env['LOG_LEVEL'] {
    return this.env.LOG_LEVEL;
  }

  get databaseUrl(): string {
    return this.env.DATABASE_URL;
  }

  get appUrl(): string {
    return this.env.APP_URL;
  }

  /**
   * Whether the application is actually reached over HTTPS, which is what the
   * Secure cookie flag must follow. Deriving it from NODE_ENV instead would break
   * a deployment served over plain HTTP, such as one reachable only on a local
   * network: browsers withhold Secure cookies from insecure origins, so the
   * session would be discarded immediately after signing in. localhost is the
   * one exception browsers make, which is why this only shows up once the app is
   * opened from another machine.
   */
  get servedOverHttps(): boolean {
    return this.env.APP_URL.startsWith('https://');
  }

  /** Browser origins allowed to call the API, including the app's own origin. */
  get allowedOrigins(): string[] {
    const configured = this.env.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);

    return [...new Set([this.originOf(this.env.APP_URL), ...configured])];
  }

  get timezone(): string {
    return this.env.BUSINESS_TIMEZONE;
  }

  get currency(): string {
    return this.env.CURRENCY;
  }

  get sessionSecret(): string {
    return this.env.SESSION_SECRET;
  }

  get sessionCookieName(): string {
    return this.env.SESSION_COOKIE_NAME;
  }

  get sessionTtlDays(): number {
    return this.env.SESSION_TTL_DAYS;
  }

  get swaggerEnabled(): boolean {
    return this.env.ENABLE_SWAGGER;
  }

  get trustProxy(): boolean {
    return this.env.TRUST_PROXY;
  }

  private originOf(url: string): string {
    return new URL(url).origin;
  }
}
