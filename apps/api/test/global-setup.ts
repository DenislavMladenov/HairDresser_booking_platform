import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';

/**
 * Applies migrations to the test database once, before any suite runs. Using
 * `migrate deploy` rather than `db push` means the tests exercise exactly the
 * migrations that production will run, including the hand-written exclusion
 * constraint that Prisma cannot express.
 */
export default function globalSetup(): void {
  loadEnv({ path: resolve(process.cwd(), '../../.env'), quiet: true });

  const databaseUrl = process.env.TEST_DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('TEST_DATABASE_URL is not set; cannot prepare the test database.');
  }

  execFileSync(resolve('node_modules/.bin/prisma'), ['migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });
}
