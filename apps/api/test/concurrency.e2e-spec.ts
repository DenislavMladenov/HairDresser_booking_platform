import { ApiErrorCode } from '@booking/shared';
import { isOverlapViolation } from '../src/common/errors/database-errors';
import { BookingStatus } from '../src/generated/prisma/enums';
import {
  createService,
  createSettings,
  createTestApp,
  createWorkingHours,
  futureDate,
  localInstant,
  resetDatabase,
  TestClient,
  type ServiceFixture,
  type TestContext,
} from './helpers/test-app';

/**
 * The double-booking guarantee.
 *
 * Checking availability and then inserting is inherently racy: two requests can
 * both see a free slot before either has written. The application does not try
 * to win that race with locks or serialised reads. Instead the database refuses
 * the second write through the booking_no_overlap exclusion constraint, and the
 * API turns that refusal into a 409.
 *
 * These tests fire genuinely simultaneous requests and assert that exactly one
 * of them ends up owning the slot.
 */
describe('Concurrent booking attempts', () => {
  let context: TestContext;
  let service: ServiceFixture;
  let date: string;

  beforeAll(async () => {
    context = await createTestApp();
  });

  afterAll(async () => {
    await context.close();
  });

  beforeEach(async () => {
    await resetDatabase(context.prisma);
    await createSettings(context, { slotIntervalMinutes: 60 });
    await createWorkingHours(context, { openMinute: 9 * 60, closeMinute: 17 * 60 });
    service = await createService(context, { durationMinutes: 60 });
    date = futureDate(context, 7);
  });

  /** Independent clients, so no cookie or rate limit state is shared. */
  async function createClients(count: number): Promise<TestClient[]> {
    return Promise.all(Array.from({ length: count }, () => TestClient.create(context.server)));
  }

  function payload(hour: number, name: string) {
    return {
      serviceId: service.id,
      startTime: localInstant(context, date, hour),
      customerName: name,
      customerPhone: '0888123456',
    };
  }

  it('lets exactly one of two simultaneous requests win the same slot', async () => {
    const [first, second] = await createClients(2);

    const responses = await Promise.all([
      first!.post('/api/bookings').send(payload(10, 'Customer One')),
      second!.post('/api/bookings').send(payload(10, 'Customer Two')),
    ]);

    const statuses = responses.map((response) => response.status).sort((a, b) => a - b);
    expect(statuses).toEqual([201, 409]);

    const rejected = responses.find((response) => response.status === 409);
    expect([ApiErrorCode.SLOT_TAKEN, ApiErrorCode.SLOT_UNAVAILABLE]).toContain(rejected!.body.code);

    // Most importantly: one appointment exists, not two.
    const bookings = await context.prisma.booking.findMany();
    expect(bookings).toHaveLength(1);
  });

  it('keeps only one appointment when ten clients rush the same slot', async () => {
    const clients = await createClients(10);

    const responses = await Promise.all(
      clients.map((client, index) =>
        client.post('/api/bookings').send(payload(11, `Customer ${index}`)),
      ),
    );

    const created = responses.filter((response) => response.status === 201);
    const conflicted = responses.filter((response) => response.status === 409);

    expect(created).toHaveLength(1);
    expect(conflicted).toHaveLength(9);
    // No request may fail for an unexpected reason: a 500 here would mean the
    // constraint violation was not translated properly.
    expect(responses.every((response) => [201, 409].includes(response.status))).toBe(true);

    expect(await context.prisma.booking.count()).toBe(1);
  });

  it('rejects a simultaneous overlapping booking of a longer service', async () => {
    const long = await createService(context, { name: 'Long', durationMinutes: 120 });
    const [first, second] = await createClients(2);

    const responses = await Promise.all([
      // 10:00-11:00
      first!.post('/api/bookings').send(payload(10, 'Short booking')),
      // 09:00-11:00 overlaps the above
      second!.post('/api/bookings').send({ ...payload(9, 'Long booking'), serviceId: long.id }),
    ]);

    const statuses = responses.map((response) => response.status).sort((a, b) => a - b);
    expect(statuses).toEqual([201, 409]);
    expect(await context.prisma.booking.count()).toBe(1);
  });

  it('allows simultaneous bookings of adjacent slots', async () => {
    const [first, second] = await createClients(2);

    const responses = await Promise.all([
      first!.post('/api/bookings').send(payload(10, 'First')),
      second!.post('/api/bookings').send(payload(11, 'Second')),
    ]);

    expect(responses.map((response) => response.status)).toEqual([201, 201]);
    expect(await context.prisma.booking.count()).toBe(2);
  });

  it('allows a new booking to win the slot that a concurrent cancellation frees', async () => {
    const client = (await createClients(1))[0]!;
    const created = await client.post('/api/bookings').send(payload(10, 'Original')).expect(201);

    await context.prisma.booking.update({
      where: { id: created.body.id },
      data: { status: BookingStatus.CANCELLED, cancelledAt: new Date() },
    });

    await client.post('/api/bookings').send(payload(10, 'Replacement')).expect(201);

    const active = await context.prisma.booking.count({
      where: { status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] } },
    });
    expect(active).toBe(1);
  });

  /**
   * Guards the error translation itself. If a future Prisma or driver upgrade
   * changes the shape of the error, isOverlapViolation would silently stop
   * matching and concurrent bookings would surface as 500s instead of 409s.
   */
  it('recognises the raw exclusion violation raised by the database', async () => {
    await context.prisma.booking.create({
      data: {
        customerName: 'First',
        customerPhone: '0888123456',
        serviceId: service.id,
        startTime: localInstant(context, date, 10),
        endTime: localInstant(context, date, 11),
      },
    });

    expect.assertions(2);

    try {
      await context.prisma.booking.create({
        data: {
          customerName: 'Overlapping',
          customerPhone: '0888123456',
          serviceId: service.id,
          startTime: localInstant(context, date, 10, 30),
          endTime: localInstant(context, date, 11, 30),
        },
      });
    } catch (error) {
      expect(isOverlapViolation(error)).toBe(true);
      // A plain not-found error must not be mistaken for an overlap.
      expect(isOverlapViolation(new Error('P2025: record not found'))).toBe(false);
    }
  });
});
