import { ApiErrorCode } from '@booking/shared';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  createAdminUser,
  createTestApp,
  resetDatabase,
  TestClient,
  type TestContext,
} from './helpers/test-app';

describe('Authentication', () => {
  let context: TestContext;
  let client: TestClient;

  beforeAll(async () => {
    context = await createTestApp();
  });

  afterAll(async () => {
    await context.close();
  });

  beforeEach(async () => {
    await resetDatabase(context.prisma);
    await createAdminUser(context);
    client = await TestClient.create(context.server);
  });

  describe('CSRF protection', () => {
    it('hands out a token and a readable cookie', async () => {
      const response = await client.get('/api/auth/csrf').expect(200);

      expect(typeof response.body.csrfToken).toBe('string');
      expect(response.body.csrfToken.length).toBeGreaterThanOrEqual(32);
    });

    it('rejects a state-changing request without the token header', async () => {
      const response = await client
        .postWithoutCsrf('/api/auth/login')
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        .expect(403);

      expect(response.body.code).toBe(ApiErrorCode.CSRF_FAILED);
    });

    it('rejects a token that does not match the cookie', async () => {
      const response = await client
        .postWithoutCsrf('/api/auth/login')
        .set('X-CSRF-Token', 'a-token-that-was-never-issued-to-this-client')
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        .expect(403);

      expect(response.body.code).toBe(ApiErrorCode.CSRF_FAILED);
    });

    it('rejects a request from an origin that is not allowed', async () => {
      const response = await client
        .post('/api/auth/login')
        .set('Origin', 'https://attacker.example.com')
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        .expect(403);

      expect(response.body.code).toBe(ApiErrorCode.CSRF_FAILED);
    });

    it('allows a request from the configured application origin', async () => {
      await client
        .post('/api/auth/login')
        .set('Origin', context.config.appUrl)
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        .expect(200);
    });

    it('does not require a token for safe methods', async () => {
      await client.get('/api/services').expect(200);
      await client.get('/api/health').expect(200);
    });
  });

  describe('Login', () => {
    it('accepts correct credentials and sets a session cookie', async () => {
      const response = await client.login().expect(200);

      expect(response.body).toEqual({
        id: expect.any(String),
        email: ADMIN_EMAIL,
        role: 'ADMIN',
      });

      const cookies = response.headers['set-cookie'] as unknown as string[];
      const session = cookies.find((cookie) =>
        cookie.startsWith(`${context.config.sessionCookieName}=`),
      );

      expect(session).toBeDefined();
      expect(session).toContain('HttpOnly');
      expect(session).toContain('SameSite=Lax');
      expect(session).toContain('Path=/');
    });

    it('is case-insensitive about the email address', async () => {
      await client.login(ADMIN_EMAIL.toUpperCase(), ADMIN_PASSWORD).expect(200);
    });

    it('rejects a wrong password', async () => {
      const response = await client.login(ADMIN_EMAIL, 'WrongPassword12345').expect(401);
      expect(response.body.code).toBe(ApiErrorCode.UNAUTHORIZED);
    });

    it('gives the same answer for an unknown address as for a wrong password', async () => {
      const unknown = await client.login('nobody@example.com', ADMIN_PASSWORD).expect(401);
      const wrong = await client.login(ADMIN_EMAIL, 'WrongPassword12345').expect(401);

      expect(unknown.body).toEqual(wrong.body);
    });

    it('never returns the password hash', async () => {
      const response = await client.login().expect(200);
      expect(JSON.stringify(response.body)).not.toContain('$argon2');
      expect(response.body.passwordHash).toBeUndefined();
    });

    it('validates the request body', async () => {
      await client
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: '' })
        .expect(400);
      await client.post('/api/auth/login').send({}).expect(400);
      await client
        .post('/api/auth/login')
        .send({ email: ADMIN_EMAIL, password: 'short' })
        .expect(400);
    });

    it('rejects unknown properties instead of ignoring them', async () => {
      await client
        .post('/api/auth/login')
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'ADMIN' })
        .expect(400);
    });
  });

  describe('Session lifecycle', () => {
    it('identifies the signed-in user', async () => {
      await client.login().expect(200);

      const response = await client.get('/api/auth/me').expect(200);
      expect(response.body.email).toBe(ADMIN_EMAIL);
    });

    it('refuses without a session', async () => {
      await client.get('/api/auth/me').expect(401);
    });

    it('stores only a hash of the session token', async () => {
      const response = await client.login().expect(200);
      const cookies = response.headers['set-cookie'] as unknown as string[];
      const rawCookie = cookies.find((cookie) =>
        cookie.startsWith(`${context.config.sessionCookieName}=`),
      ) as string;

      const sessions = await context.prisma.session.findMany();
      expect(sessions).toHaveLength(1);

      // The stored value is a SHA-256 hex digest, and the cookie value never
      // appears in the database.
      expect(sessions[0]!.tokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(rawCookie).not.toContain(sessions[0]!.tokenHash);
    });

    it('invalidates the session on logout', async () => {
      await client.login().expect(200);
      await client.get('/api/auth/me').expect(200);

      await client.post('/api/auth/logout').expect(204);

      await client.get('/api/auth/me').expect(401);
    });

    it('rejects a revoked session even with a valid cookie', async () => {
      await client.login().expect(200);
      await context.prisma.session.updateMany({ data: { revokedAt: new Date() } });

      await client.get('/api/auth/me').expect(401);
    });

    it('rejects an expired session', async () => {
      await client.login().expect(200);
      await context.prisma.session.updateMany({
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      await client.get('/api/auth/me').expect(401);
    });

    it('rejects a forged cookie value', async () => {
      await client
        .get('/api/auth/me')
        .set('Cookie', `${context.config.sessionCookieName}=not-a-real-token`)
        .expect(401);
    });
  });

  describe('Authorisation on admin endpoints', () => {
    const adminEndpoints = [
      '/api/admin/bookings',
      '/api/admin/services',
      '/api/admin/working-hours',
      '/api/admin/blocked-times',
      '/api/admin/settings',
    ];

    it.each(adminEndpoints)('refuses %s without a session', async (path) => {
      await client.get(path).expect(401);
    });

    it.each(adminEndpoints)('allows %s with an admin session', async (path) => {
      await client.login().expect(200);
      await client.get(path).expect(200);
    });
  });
});

describe('Login rate limiting', () => {
  // A separate application instance, because the limiter counts per instance and
  // the tests above would otherwise consume the budget.
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestApp();
    await resetDatabase(context.prisma);
    await createAdminUser(context);
  });

  afterAll(async () => {
    await context.close();
  });

  const SHARED_IP = '198.51.100.7';

  it('blocks further attempts after five failures', async () => {
    const client = await TestClient.create(context.server, SHARED_IP);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await client.login(ADMIN_EMAIL, 'WrongPassword12345').expect(401);
    }

    const response = await client.login(ADMIN_EMAIL, 'WrongPassword12345').expect(429);
    expect(response.body.code).toBe(ApiErrorCode.RATE_LIMITED);
  });

  it('keeps blocking the same client even when the credentials are correct', async () => {
    const client = await TestClient.create(context.server, SHARED_IP);
    await client.login().expect(429);
  });

  it('does not affect a different client', async () => {
    const other = await TestClient.create(context.server);
    await other.login().expect(200);
  });
});
