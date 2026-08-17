import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

// Prisma 7 no longer loads .env automatically. The repository keeps a single
// .env at its root; a local apps/api/.env may override it for one-off work.
loadEnv({ path: resolve(process.cwd(), '../../.env'), quiet: true });
loadEnv({ path: resolve(process.cwd(), '.env'), quiet: true, override: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node -r @swc-node/register src/scripts/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
