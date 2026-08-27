import { ApiErrorCode } from '@booking/shared';
import { BookingStatus } from '../src/generated/prisma/enums';
import {
  createAdminUser,
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

describe('Bookings', () => {
  let context: TestContext;
  let client: TestClient;
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
    await createAdminUser(context);
    await createSettings(context, { slotIntervalMinutes: 60 });
    await createWorkingHours(context, { openMinute: 9 * 60, closeMinute: 17 * 60 });
    service = await createService(context, { durationMinutes: 60 });
    client = await TestClient.create(context.server);
    date = futureDate(context, 7);
  });

  function bookingPayload(hour: number, overrides: Record<string, unknown> = {}) {
    return {
      serviceId: service.id,
      startTime: localInstant(context, date, hour),
      customerName: 'Ivan Petrov',
      customerPhone: '0888123456',
      ...overrides,
    };
  }

  describe('creating a booking as a customer', () => {
    it('accepts an advertised slot', async () => {
      const response = await client.post('/api/bookings').send(bookingPayload(10)).expect(201);

      expect(response.body).toEqual({
        id: expect.any(String),
        startTime: localInstant(context, date, 10),
        endTime: localInstant(context, date, 11),
        status: BookingStatus.PENDING,
        serviceName: 'Haircut',
        durationMinutes: 60,
        timezone: 'Europe/Sofia',
      });
    });

    it('derives the end time from the service duration', async () => {
      const short = await createService(context, { name: 'Trim', durationMinutes: 20 });

      const response = await client
        .post('/api/bookings')
        .send({ ...bookingPayload(10), serviceId: short.id })
        .expect(201);

      expect(response.body.endTime).toBe(
        localInstant(context, date, 10, 20).replace('+00:00', 'Z'),
      );
    });

    it('stores the customer details for the barber', async () => {
      await client
        .post('/api/bookings')
        .send(bookingPayload(10, { customerEmail: 'IVAN@Example.COM' }))
        .expect(201);

      const booking = await context.prisma.booking.findFirstOrThrow();
      expect(booking.customerName).toBe('Ivan Petrov');
      expect(booking.customerPhone).toBe('0888123456');
      // Normalised so the same address is always stored the same way.
      expect(booking.customerEmail).toBe('ivan@example.com');
      expect(booking.createdByAdmin).toBe(false);
    });

    it('returns nothing about other customers', async () => {
      await context.prisma.booking.create({
        data: {
          customerName: 'Someone Else',
          customerPhone: '0899000111',
          serviceId: service.id,
          startTime: localInstant(context, date, 12),
          endTime: localInstant(context, date, 13),
        },
      });

      const response = await client.post('/api/bookings').send(bookingPayload(10)).expect(201);

      expect(JSON.stringify(response.body)).not.toContain('Someone Else');
      expect(JSON.stringify(response.body)).not.toContain('0899000111');
      expect(response.body.customerName).toBeUndefined();
      expect(response.body.customerPhone).toBeUndefined();
    });

    it('refuses a slot that was never offered because it is off the grid', async () => {
      const response = await client
        .post('/api/bookings')
        .send({ ...bookingPayload(10), startTime: localInstant(context, date, 10, 7) })
        .expect(409);

      expect(response.body.code).toBe(ApiErrorCode.SLOT_UNAVAILABLE);
    });

    it('refuses a time outside working hours', async () => {
      const early = await client.post('/api/bookings').send(bookingPayload(7)).expect(409);
      expect(early.body.code).toBe(ApiErrorCode.SLOT_UNAVAILABLE);

      await client.post('/api/bookings').send(bookingPayload(20)).expect(409);
    });

    it('refuses a time that would run past closing', async () => {
      // Opens 09:00, closes 17:00, service is an hour: 16:00 is the last slot.
      await client.post('/api/bookings').send(bookingPayload(16)).expect(201);

      const response = await client.post('/api/bookings').send(bookingPayload(17)).expect(409);
      expect(response.body.code).toBe(ApiErrorCode.SLOT_UNAVAILABLE);
    });

    it('refuses a time inside a break', async () => {
      await context.prisma.weeklyBreak.deleteMany();
      for (const dayOfWeek of [1, 2, 3, 4, 5, 6, 7]) {
        await context.prisma.weeklyBreak.create({
          data: { dayOfWeek, startMinute: 13 * 60, endMinute: 14 * 60 },
        });
      }

      const response = await client.post('/api/bookings').send(bookingPayload(13)).expect(409);
      expect(response.body.code).toBe(ApiErrorCode.SLOT_UNAVAILABLE);
    });

    it('refuses a time inside a blocked period', async () => {
      await context.prisma.blockedTime.create({
        data: {
          startTime: localInstant(context, date, 10),
          endTime: localInstant(context, date, 12),
        },
      });

      const response = await client.post('/api/bookings').send(bookingPayload(10)).expect(409);
      expect(response.body.code).toBe(ApiErrorCode.SLOT_UNAVAILABLE);
    });

    it('refuses a day the shop is closed', async () => {
      await context.prisma.workingHours.updateMany({ data: { enabled: false } });

      await client.post('/api/bookings').send(bookingPayload(10)).expect(409);
    });

    it('refuses a disabled service', async () => {
      await context.prisma.service.update({
        where: { id: service.id },
        data: { active: false },
      });

      const response = await client.post('/api/bookings').send(bookingPayload(10)).expect(409);
      expect(response.body.code).toBe(ApiErrorCode.SERVICE_INACTIVE);
    });

    it('refuses a slot inside the minimum lead time', async () => {
      await context.prisma.bookingSettings.update({
        where: { id: 1 },
        data: { minLeadTimeMinutes: 10 * 24 * 60 },
      });

      await client.post('/api/bookings').send(bookingPayload(10)).expect(409);
    });

    it('refuses a slot beyond the booking horizon', async () => {
      await context.prisma.bookingSettings.update({
        where: { id: 1 },
        data: { maxAdvanceDays: 2 },
      });

      const farDate = futureDate(context, 30);
      await client
        .post('/api/bookings')
        .send({ ...bookingPayload(10), startTime: localInstant(context, farDate, 10) })
        .expect(409);
    });

    it('refuses a slot already taken, reporting a conflict', async () => {
      await client.post('/api/bookings').send(bookingPayload(10)).expect(201);

      const response = await client.post('/api/bookings').send(bookingPayload(10)).expect(409);
      expect([ApiErrorCode.SLOT_UNAVAILABLE, ApiErrorCode.SLOT_TAKEN]).toContain(
        response.body.code,
      );
    });

    it('allows a booking that starts exactly when another ends', async () => {
      await client.post('/api/bookings').send(bookingPayload(10)).expect(201);
      await client.post('/api/bookings').send(bookingPayload(11)).expect(201);

      expect(await context.prisma.booking.count()).toBe(2);
    });

    it('frees the slot again once cancelled', async () => {
      const created = await client.post('/api/bookings').send(bookingPayload(10)).expect(201);

      await client.login().expect(200);
      await client.post(`/api/admin/bookings/${created.body.id}/cancel`).expect(200);

      await client.post('/api/bookings').send(bookingPayload(10)).expect(201);
    });

    it('requires the CSRF token', async () => {
      await client.postWithoutCsrf('/api/bookings').send(bookingPayload(10)).expect(403);
    });
  });

  describe('validating customer input', () => {
    it('rejects a missing or too short name', async () => {
      await client
        .post('/api/bookings')
        .send(bookingPayload(10, { customerName: '' }))
        .expect(400);
      await client
        .post('/api/bookings')
        .send(bookingPayload(10, { customerName: 'A' }))
        .expect(400);
    });

    it('rejects an over-long name', async () => {
      await client
        .post('/api/bookings')
        .send(bookingPayload(10, { customerName: 'x'.repeat(200) }))
        .expect(400);
    });

    it('rejects an implausible phone number', async () => {
      for (const phone of ['', 'abc', '12', 'call me', '+++']) {
        await client
          .post('/api/bookings')
          .send(bookingPayload(10, { customerPhone: phone }))
          .expect(400);
      }
    });

    it('accepts common phone formats', async () => {
      const accepted = ['0888123456', '+359 88 812 3456', '(02) 123 4567', '+359-888-123-456'];

      for (const [index, phone] of accepted.entries()) {
        await client
          .post('/api/bookings')
          .send(bookingPayload(9 + index, { customerPhone: phone }))
          .expect(201);
      }
    });

    it('rejects a malformed email but allows omitting it', async () => {
      await client
        .post('/api/bookings')
        .send(bookingPayload(10, { customerEmail: 'not-an-email' }))
        .expect(400);

      await client.post('/api/bookings').send(bookingPayload(11)).expect(201);
    });

    it('rejects a malformed start time', async () => {
      await client
        .post('/api/bookings')
        .send(bookingPayload(10, { startTime: 'next tuesday' }))
        .expect(400);
    });

    it('rejects unknown properties, including attempts to set the status', async () => {
      await client
        .post('/api/bookings')
        .send(bookingPayload(10, { status: BookingStatus.CONFIRMED }))
        .expect(400);

      await client
        .post('/api/bookings')
        .send(bookingPayload(10, { createdByAdmin: true }))
        .expect(400);

      await client
        .post('/api/bookings')
        .send(bookingPayload(10, { notes: 'x' }))
        .expect(400);
    });
  });

  describe('managing appointments as the barber', () => {
    beforeEach(async () => {
      await client.login().expect(200);
    });

    it('lists appointments for a day with customer details', async () => {
      await client.post('/api/bookings').send(bookingPayload(10)).expect(201);

      const response = await client.get(`/api/admin/bookings?date=${date}`).expect(200);

      expect(response.body.total).toBe(1);
      expect(response.body.items[0]).toMatchObject({
        customerName: 'Ivan Petrov',
        customerPhone: '0888123456',
        status: BookingStatus.PENDING,
        service: { name: 'Haircut', durationMinutes: 60, price: '25.00', currency: 'EUR' },
      });
    });

    it('filters by status', async () => {
      const first = await client.post('/api/bookings').send(bookingPayload(10)).expect(201);
      await client.post('/api/bookings').send(bookingPayload(11)).expect(201);
      await client.post(`/api/admin/bookings/${first.body.id}/confirm`).expect(200);

      const confirmed = await client
        .get(`/api/admin/bookings?date=${date}&status=CONFIRMED`)
        .expect(200);
      expect(confirmed.body.total).toBe(1);

      const both = await client
        .get(`/api/admin/bookings?date=${date}&status=CONFIRMED,PENDING`)
        .expect(200);
      expect(both.body.total).toBe(2);
    });

    it('creates an appointment manually outside working hours', async () => {
      const response = await client
        .post('/api/admin/bookings')
        .send({
          serviceId: service.id,
          startTime: localInstant(context, date, 20),
          customerName: 'Walk In',
          customerPhone: '0877000000',
          notes: 'Regular customer, after hours',
        })
        .expect(201);

      expect(response.body.status).toBe(BookingStatus.CONFIRMED);
      expect(response.body.createdByAdmin).toBe(true);
      expect(response.body.notes).toBe('Regular customer, after hours');
    });

    it('still refuses a manual appointment that overlaps another', async () => {
      await client.post('/api/bookings').send(bookingPayload(10)).expect(201);

      const response = await client
        .post('/api/admin/bookings')
        .send({
          serviceId: service.id,
          startTime: localInstant(context, date, 10, 30),
          customerName: 'Overlapping',
          customerPhone: '0877000000',
        })
        .expect(409);

      expect(response.body.code).toBe(ApiErrorCode.SLOT_TAKEN);
    });

    it('moves an appointment to another time', async () => {
      const created = await client.post('/api/bookings').send(bookingPayload(10)).expect(201);

      const response = await client
        .patch(`/api/admin/bookings/${created.body.id}`)
        .send({ startTime: localInstant(context, date, 15) })
        .expect(200);

      expect(response.body.startTime).toBe(localInstant(context, date, 15));
      expect(response.body.endTime).toBe(localInstant(context, date, 16));
    });

    it('refuses to move an appointment onto another one', async () => {
      const first = await client.post('/api/bookings').send(bookingPayload(10)).expect(201);
      await client.post('/api/bookings').send(bookingPayload(12)).expect(201);

      const response = await client
        .patch(`/api/admin/bookings/${first.body.id}`)
        .send({ startTime: localInstant(context, date, 12) })
        .expect(409);

      expect(response.body.code).toBe(ApiErrorCode.SLOT_TAKEN);
    });

    it('recalculates the end time when the service changes', async () => {
      const created = await client.post('/api/bookings').send(bookingPayload(10)).expect(201);
      const long = await createService(context, { name: 'Full service', durationMinutes: 120 });

      const response = await client
        .patch(`/api/admin/bookings/${created.body.id}`)
        .send({ serviceId: long.id })
        .expect(200);

      expect(response.body.endTime).toBe(localInstant(context, date, 12));
    });

    it('edits notes and contact details without touching the time', async () => {
      const created = await client.post('/api/bookings').send(bookingPayload(10)).expect(201);

      const response = await client
        .patch(`/api/admin/bookings/${created.body.id}`)
        .send({ notes: 'Prefers scissors', customerPhone: '0999888777' })
        .expect(200);

      expect(response.body.notes).toBe('Prefers scissors');
      expect(response.body.customerPhone).toBe('0999888777');
      expect(response.body.startTime).toBe(localInstant(context, date, 10));
    });

    it('walks an appointment through confirm and complete', async () => {
      const created = await client.post('/api/bookings').send(bookingPayload(10)).expect(201);

      const confirmed = await client
        .post(`/api/admin/bookings/${created.body.id}/confirm`)
        .expect(200);
      expect(confirmed.body.status).toBe(BookingStatus.CONFIRMED);

      const completed = await client
        .post(`/api/admin/bookings/${created.body.id}/complete`)
        .expect(200);
      expect(completed.body.status).toBe(BookingStatus.COMPLETED);
    });

    it('records a no-show', async () => {
      const created = await client.post('/api/bookings').send(bookingPayload(10)).expect(201);

      const response = await client
        .post(`/api/admin/bookings/${created.body.id}/no-show`)
        .expect(200);
      expect(response.body.status).toBe(BookingStatus.NO_SHOW);
    });

    it('refuses an impossible status change', async () => {
      const created = await client.post('/api/bookings').send(bookingPayload(10)).expect(201);
      await client.post(`/api/admin/bookings/${created.body.id}/cancel`).expect(200);

      const response = await client
        .post(`/api/admin/bookings/${created.body.id}/complete`)
        .expect(409);
      expect(response.body.code).toBe(ApiErrorCode.INVALID_STATUS_TRANSITION);
    });

    it('refuses to reschedule a cancelled appointment', async () => {
      const created = await client.post('/api/bookings').send(bookingPayload(10)).expect(201);
      await client.post(`/api/admin/bookings/${created.body.id}/cancel`).expect(200);

      const response = await client
        .patch(`/api/admin/bookings/${created.body.id}`)
        .send({ startTime: localInstant(context, date, 15) })
        .expect(409);

      expect(response.body.code).toBe(ApiErrorCode.INVALID_STATUS_TRANSITION);
    });

    it('records when an appointment was cancelled', async () => {
      const created = await client.post('/api/bookings').send(bookingPayload(10)).expect(201);
      await client.post(`/api/admin/bookings/${created.body.id}/cancel`).expect(200);

      const booking = await context.prisma.booking.findUniqueOrThrow({
        where: { id: created.body.id },
      });
      expect(booking.cancelledAt).toBeInstanceOf(Date);
    });

    it('answers 404 for an unknown appointment and 400 for a malformed id', async () => {
      await client.get('/api/admin/bookings/01a01049-0151-779b-8f1f-000000000000').expect(404);
      await client.get('/api/admin/bookings/not-a-uuid').expect(400);
    });
  });

  describe('blocking time as the barber', () => {
    beforeEach(async () => {
      await client.login().expect(200);
    });

    it('refuses to block a period that already holds appointments', async () => {
      await client.post('/api/bookings').send(bookingPayload(10)).expect(201);

      const response = await client
        .post('/api/admin/blocked-times')
        .send({
          startTime: localInstant(context, date, 9),
          endTime: localInstant(context, date, 12),
          reason: 'Dentist',
        })
        .expect(409);

      expect(response.body.message).toContain('appointment');
    });

    it('blocks it anyway when explicitly forced', async () => {
      await client.post('/api/bookings').send(bookingPayload(10)).expect(201);

      await client
        .post('/api/admin/blocked-times')
        .send({
          startTime: localInstant(context, date, 9),
          endTime: localInstant(context, date, 12),
          reason: 'Emergency',
          force: true,
        })
        .expect(201);
    });

    it('blocks a whole day in local time', async () => {
      const response = await client
        .post('/api/admin/blocked-times/whole-day')
        .send({ date, reason: 'Holiday' })
        .expect(201);

      expect(response.body.startTime).toBe(localInstant(context, date, 0));
      expect(response.body.reason).toBe('Holiday');

      await client.post('/api/bookings').send(bookingPayload(10)).expect(409);
    });

    it('rejects a period that ends before it starts', async () => {
      await client
        .post('/api/admin/blocked-times')
        .send({
          startTime: localInstant(context, date, 12),
          endTime: localInstant(context, date, 10),
        })
        .expect(400);
    });

    it('removes a blocked period', async () => {
      const created = await client
        .post('/api/admin/blocked-times/whole-day')
        .send({ date })
        .expect(201);

      await client.delete(`/api/admin/blocked-times/${created.body.id}`).expect(204);
      await client.post('/api/bookings').send(bookingPayload(10)).expect(201);
    });
  });
});
