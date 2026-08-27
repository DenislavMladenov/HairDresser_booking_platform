import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';

/**
 * Points the integration suite at the dedicated test database.
 *
 * dotenv does not overwrite variables that are already set, and this file runs
 * before the application is created, so the DATABASE_URL assigned here wins over
 * the development value in .env. Tests therefore can never truncate development
 * data by accident.
 */
loadEnv({ path: resolve(process.cwd(), '../../.env'), quiet: true });
loadEnv({ path: resolve(process.cwd(), '.env'), quiet: true, override: true });

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error(
    'TEST_DATABASE_URL is not set. Start the dev database with `pnpm db:up` and copy .env.example to .env.',
  );
}

if (!/_test(\?|$)/.test(testDatabaseUrl)) {
  throw new Error(
    `Refusing to run integration tests against "${testDatabaseUrl}": the database name must end with _test.`,
  );
}

process.env.DATABASE_URL = testDatabaseUrl;
process.env.NODE_ENV = 'test';
process.env.ENABLE_SWAGGER = 'false';
// Pinned so price assertions do not depend on the developer's own .env.
process.env.CURRENCY = 'EUR';
process.env.LOG_LEVEL = 'error';
// Production runs behind Caddy with the same setting. Trusting the forwarded
// header also lets each test client present its own client IP, so per-IP rate
// limits do not leak between unrelated tests.
process.env.TRUST_PROXY = 'true';
