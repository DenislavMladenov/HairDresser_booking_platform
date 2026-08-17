import { IANAZone } from 'luxon';
import { z } from 'zod';

/** Env vars arrive as strings, so booleans need explicit parsing. */
const booleanFromString = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

const timezone = z.string().refine((value) => IANAZone.isValidZone(value), {
  message: 'must be a valid IANA timezone, for example Europe/Sofia',
});

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(['error', 'warn', 'log', 'debug', 'verbose']).default('log'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  APP_URL: z.string().url(),
  CORS_ORIGINS: z.string().default(''),

  BUSINESS_TIMEZONE: timezone.default('Europe/Sofia'),
  CURRENCY: z
    .string()
    .regex(/^[A-Z]{3}$/, 'must be a 3-letter currency code')
    .default('BGN'),

  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  SESSION_COOKIE_NAME: z
    .string()
    .regex(/^[A-Za-z0-9_-]+$/)
    .default('barber_session'),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),

  ENABLE_SWAGGER: booleanFromString.default(false),
  TRUST_PROXY: booleanFromString.default(false),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates process.env once at startup. Failing fast with a readable list is
 * far better than discovering a missing secret on the first login attempt.
 */
export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  return result.data;
}
