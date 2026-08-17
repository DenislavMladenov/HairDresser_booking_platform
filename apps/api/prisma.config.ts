import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Prisma 7 no longer loads .env automatically. The repository keeps a single
// .env at its root; a local apps/api/.env may override it for one-off work. In
// containers the values come from the environment instead and both files are
// simply absent.
loadEnv({ path: resolve(process.cwd(), '../../.env'), quiet: true });
loadEnv({ path: resolve(process.cwd(), '.env'), quiet: true, override: true });

const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node -r @swc-node/register src/scripts/seed.ts',
  },
  // Declared only when a URL is available. `prisma generate` needs no database,
  // and requiring one here would break both image builds and a fresh clone that
  // has not been configured yet.
  ...(databaseUrl ? { datasource: { url: databaseUrl } } : {}),
});
