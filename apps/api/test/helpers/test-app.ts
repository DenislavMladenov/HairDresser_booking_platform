import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DateTime } from 'luxon';
import request from 'supertest';
import type { Server } from 'node:http';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app-setup';
import { PasswordService } from '../../src/auth/password.service';
import { AppConfig } from '../../src/config/app-config';
import { Role } from '../../src/generated/prisma/enums';
import { PrismaService } from '../../src/prisma/prisma.service';

export const ADMIN_EMAIL = 'test-admin@example.com';
export const ADMIN_PASSWORD = 'IntegrationTestPassword1';

/** Tables truncated between tests, ordered so foreign keys never block. */
const TABLES = [
  'Booking',
  'BlockedTime',
  'Session',
  'Service',
  'WeeklyBreak',
  'WorkingHours',
  'BookingSettings',
  'User',
];

export interface TestContext {
  app: NestExpressApplication;
  prisma: PrismaService;
  config: AppConfig;
  server: Server;
  close: () => Promise<void>;
}

/**
 * Boots a real application wired exactly like production, via the shared
 * configureApp. Each caller gets its own instance, which also gives each suite
 * its own in-memory rate limit counters.
 */
export async function createTestApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
  const config = app.get(AppConfig);

  configureApp(app, config);
  // Listen on an ephemeral port rather than only initialising: persistent
  // supertest agents need a stable socket to reuse across requests.
  await app.listen(0);

  const prisma = app.get(PrismaService);

  return {
    app,
    prisma,
    config,
    server: app.getHttpServer(),
    close: async () => {
      await app.close();
    },
  };
}

export async function resetDatabase(prisma: PrismaService): Promise<void> {
  const list = TABLES.map((table) => `"${table}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

/**
 * A supertest agent that keeps cookies and replays the CSRF token, mirroring
 * what a browser does. Without the token every state-changing request is
 * rejected, exactly as in production.
 */
let clientCounter = 0;

/** Each client looks like a distinct visitor, so rate limits stay isolated. */
function nextClientIp(): string {
  clientCounter += 1;
  return `10.${Math.floor(clientCounter / 65_536) % 256}.${Math.floor(clientCounter / 256) % 256}.${clientCounter % 256}`;
}

export class TestClient {
  private csrfToken = '';

  private constructor(
    private readonly agent: ReturnType<typeof request.agent>,
    private readonly clientIp: string,
  ) {}

  /**
   * Pass an explicit ip when several clients must share a rate limit bucket,
   * as the rate limiting tests do.
   */
  static async create(server: Server, ip = nextClientIp()): Promise<TestClient> {
    const client = new TestClient(request.agent(server), ip);
    await client.refreshCsrfToken();
    return client;
  }

  get token(): string {
    return this.csrfToken;
  }

  get ip(): string {
    return this.clientIp;
  }

  async refreshCsrfToken(): Promise<void> {
    const response = await this.get('/api/auth/csrf').expect(200);
    this.csrfToken = response.body.csrfToken as string;
  }

  get(path: string) {
    return this.agent.get(path).set('X-Forwarded-For', this.clientIp);
  }

  post(path: string) {
    return this.postWithoutCsrf(path).set('X-CSRF-Token', this.csrfToken);
  }

  patch(path: string) {
    return this.agent
      .patch(path)
      .set('X-Forwarded-For', this.clientIp)
      .set('X-CSRF-Token', this.csrfToken);
  }

  put(path: string) {
    return this.agent
      .put(path)
      .set('X-Forwarded-For', this.clientIp)
      .set('X-CSRF-Token', this.csrfToken);
  }

  delete(path: string) {
    return this.agent
      .delete(path)
      .set('X-Forwarded-For', this.clientIp)
      .set('X-CSRF-Token', this.csrfToken);
  }

  /** Deliberately omits the CSRF header, for tests that assert it is required. */
  postWithoutCsrf(path: string) {
    return this.agent.post(path).set('X-Forwarded-For', this.clientIp);
  }

  /** Returns the supertest chain, so callers can assert on the status directly. */
  login(email = ADMIN_EMAIL, password = ADMIN_PASSWORD) {
    return this.post('/api/auth/login').send({ email, password });
  }
}

export async function createAdminUser(context: TestContext): Promise<string> {
  const passwordHash = await context.app.get(PasswordService).hash(ADMIN_PASSWORD);
  const user = await context.prisma.user.create({
    data: { email: ADMIN_EMAIL, passwordHash, role: Role.ADMIN },
  });

  return user.id;
}

export interface ServiceFixture {
  id: string;
  durationMinutes: number;
}

export async function createService(
  context: TestContext,
  overrides: { name?: string; durationMinutes?: number; price?: string; active?: boolean } = {},
): Promise<ServiceFixture> {
  const service = await context.prisma.service.create({
    data: {
      name: overrides.name ?? 'Haircut',
      durationMinutes: overrides.durationMinutes ?? 30,
      price: overrides.price ?? '25.00',
      active: overrides.active ?? true,
    },
  });

  return { id: service.id, durationMinutes: service.durationMinutes };
}

/**
 * Opens the shop 09:00-18:00 on every day of the week, so tests are not at the
 * mercy of which weekday they happen to run on. Individual tests narrow this
 * when they need to.
 */
export async function createWorkingHours(
  context: TestContext,
  options: {
    openMinute?: number;
    closeMinute?: number;
    breaks?: Array<{ startMinute: number; endMinute: number }>;
    enabledDays?: number[];
  } = {},
): Promise<void> {
  const openMinute = options.openMinute ?? 9 * 60;
  const closeMinute = options.closeMinute ?? 18 * 60;
  const enabledDays = options.enabledDays ?? [1, 2, 3, 4, 5, 6, 7];

  for (const dayOfWeek of [1, 2, 3, 4, 5, 6, 7]) {
    await context.prisma.workingHours.create({
      data: {
        dayOfWeek,
        enabled: enabledDays.includes(dayOfWeek),
        openMinute,
        closeMinute,
      },
    });

    for (const item of options.breaks ?? []) {
      await context.prisma.weeklyBreak.create({
        data: { dayOfWeek, startMinute: item.startMinute, endMinute: item.endMinute },
      });
    }
  }
}

export async function createSettings(
  context: TestContext,
  overrides: {
    slotIntervalMinutes?: number;
    minLeadTimeMinutes?: number;
    maxAdvanceDays?: number;
  } = {},
): Promise<void> {
  await context.prisma.bookingSettings.create({
    data: {
      id: 1,
      slotIntervalMinutes: overrides.slotIntervalMinutes ?? 30,
      // Zero lead time keeps tests deterministic: every slot on a future day is
      // offered regardless of the wall-clock time the suite runs at.
      minLeadTimeMinutes: overrides.minLeadTimeMinutes ?? 0,
      maxAdvanceDays: overrides.maxAdvanceDays ?? 60,
    },
  });
}

/** A date far enough ahead to be unaffected by lead time, in the business timezone. */
export function futureDate(context: TestContext, daysAhead = 7): string {
  return DateTime.now()
    .setZone(context.config.timezone)
    .plus({ days: daysAhead })
    .toISODate() as string;
}

/** Builds an absolute instant for a wall-clock time on a local date. */
export function localInstant(
  context: TestContext,
  isoDate: string,
  hour: number,
  minute = 0,
): string {
  return DateTime.fromISO(isoDate, { zone: context.config.timezone })
    .set({ hour, minute, second: 0, millisecond: 0 })
    .toUTC()
    .toISO() as string;
}
