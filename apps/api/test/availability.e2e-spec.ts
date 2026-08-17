import { ApiErrorCode } from '@booking/shared';
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
 * The availability endpoint is the only source of truth for what a customer may
 * book, so these tests pin every rule that removes a slot from the list.
 */
describe('Availability', () => {
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
    client = await TestClient.create(context.server);
    date = futureDate(context, 7);
  });

  async function labelsFor(day = date, serviceId = service.id): Promise<string[]> {
    const response = await client
      .get(`/api/availability?serviceId=${serviceId}&date=${day}`)
      .expect(200);

    return (response.body.slots as Array<{ label: string }>).map((slot) => slot.label);
  }

  describe('working hours', () => {
    it('offers slots across the whole open window', async () => {
      await createSettings(context, { slotIntervalMinutes: 60 });
      await createWorkingHours(context, { openMinute: 9 * 60, closeMinute: 13 * 60 });
      service = await createService(context, { durationMinutes: 60 });

      expect(await labelsFor()).toEqual(['09:00', '10:00', '11:00', '12:00']);
    });

    it('offers nothing on a day the shop is closed', async () => {
      await createSettings(context);
      await createWorkingHours(context, { enabledDays: [] });
      service = await createService(context);

      expect(await labelsFor()).toEqual([]);
    });

    it('reports the timezone and duration alongside the slots', async () => {
      await createSettings(context);
      await createWorkingHours(context);
      service = await createService(context, { durationMinutes: 45 });

      const response = await client
        .get(`/api/availability?serviceId=${service.id}&date=${date}`)
        .expect(200);

      expect(response.body.timezone).toBe('Europe/Sofia');
      expect(response.body.durationMinutes).toBe(45);
      expect(response.body.date).toBe(date);
    });
  });

  describe('breaks', () => {
    it('removes candidates that overlap a break', async () => {
      await createSettings(context, { slotIntervalMinutes: 60 });
      await createWorkingHours(context, {
        openMinute: 11 * 60,
        closeMinute: 16 * 60,
        breaks: [{ startMinute: 13 * 60, endMinute: 14 * 60 }],
      });
      service = await createService(context, { durationMinutes: 60 });

      expect(await labelsFor()).toEqual(['11:00', '12:00', '14:00', '15:00']);
    });
  });

  describe('existing appointments', () => {
    beforeEach(async () => {
      await createSettings(context, { slotIntervalMinutes: 60 });
      await createWorkingHours(context, { openMinute: 9 * 60, closeMinute: 12 * 60 });
      service = await createService(context, { durationMinutes: 60 });
    });

    it('removes a slot that is already booked', async () => {
      await context.prisma.booking.create({
        data: {
          customerName: 'Existing',
          customerPhone: '0888000000',
          serviceId: service.id,
          startTime: localInstant(context, date, 10),
          endTime: localInstant(context, date, 11),
        },
      });

      expect(await labelsFor()).toEqual(['09:00', '11:00']);
    });

    it('keeps the slot when the appointment was cancelled', async () => {
      await context.prisma.booking.create({
        data: {
          customerName: 'Cancelled',
          customerPhone: '0888000000',
          serviceId: service.id,
          startTime: localInstant(context, date, 10),
          endTime: localInstant(context, date, 11),
          status: BookingStatus.CANCELLED,
        },
      });

      expect(await labelsFor()).toEqual(['09:00', '10:00', '11:00']);
    });

    it('keeps the slot when the customer did not show up', async () => {
      await context.prisma.booking.create({
        data: {
          customerName: 'No show',
          customerPhone: '0888000000',
          serviceId: service.id,
          startTime: localInstant(context, date, 10),
          endTime: localInstant(context, date, 11),
          status: BookingStatus.NO_SHOW,
        },
      });

      expect(await labelsFor()).toContain('10:00');
    });

    it('counts a completed appointment as occupying its slot', async () => {
      await context.prisma.booking.create({
        data: {
          customerName: 'Completed',
          customerPhone: '0888000000',
          serviceId: service.id,
          startTime: localInstant(context, date, 10),
          endTime: localInstant(context, date, 11),
          status: BookingStatus.COMPLETED,
        },
      });

      expect(await labelsFor()).not.toContain('10:00');
    });

    it('blocks slots of a different service that overlap in time', async () => {
      const longService = await createService(context, {
        name: 'Long service',
        durationMinutes: 120,
      });

      await context.prisma.booking.create({
        data: {
          customerName: 'Existing',
          customerPhone: '0888000000',
          serviceId: longService.id,
          startTime: localInstant(context, date, 9),
          endTime: localInstant(context, date, 11),
        },
      });

      expect(await labelsFor()).toEqual(['11:00']);
    });
  });

  describe('blocked periods', () => {
    it('removes slots covered by a blocked period', async () => {
      await createSettings(context, { slotIntervalMinutes: 60 });
      await createWorkingHours(context, { openMinute: 9 * 60, closeMinute: 13 * 60 });
      service = await createService(context, { durationMinutes: 60 });

      await context.prisma.blockedTime.create({
        data: {
          startTime: localInstant(context, date, 10),
          endTime: localInstant(context, date, 12),
          reason: 'Dentist',
        },
      });

      expect(await labelsFor()).toEqual(['09:00', '12:00']);
    });

    it('removes the whole day when the day is blocked', async () => {
      await createSettings(context);
      await createWorkingHours(context);
      service = await createService(context);

      const bounds = await client.get(`/api/availability?serviceId=${service.id}&date=${date}`);
      expect(bounds.body.slots.length).toBeGreaterThan(0);

      await context.prisma.blockedTime.create({
        data: {
          startTime: localInstant(context, date, 0),
          endTime: localInstant(context, futureDate(context, 8), 0),
          reason: 'Holiday',
        },
      });

      expect(await labelsFor()).toEqual([]);
    });
  });

  describe('booking policy', () => {
    it('hides slots that fall inside the minimum lead time', async () => {
      // A ten day lead time removes everything from a date seven days out.
      await createSettings(context, { minLeadTimeMinutes: 10 * 24 * 60 });
      await createWorkingHours(context);
      service = await createService(context);

      expect(await labelsFor()).toEqual([]);
    });

    it('hides days beyond the booking horizon', async () => {
      await createSettings(context, { maxAdvanceDays: 2 });
      await createWorkingHours(context);
      service = await createService(context);

      expect(await labelsFor(futureDate(context, 30))).toEqual([]);
    });

    it('uses the configured slot interval', async () => {
      await createSettings(context, { slotIntervalMinutes: 15 });
      await createWorkingHours(context, { openMinute: 9 * 60, closeMinute: 10 * 60 });
      service = await createService(context, { durationMinutes: 30 });

      expect(await labelsFor()).toEqual(['09:00', '09:15', '09:30']);
    });
  });

  describe('services', () => {
    it('rejects a service that does not exist', async () => {
      await createSettings(context);
      await createWorkingHours(context);

      const response = await client
        .get(`/api/availability?serviceId=01a01049-0151-779b-8f1f-000000000000&date=${date}`)
        .expect(404);

      expect(response.body.code).toBe(ApiErrorCode.NOT_FOUND);
    });

    it('rejects a service that has been disabled', async () => {
      await createSettings(context);
      await createWorkingHours(context);
      service = await createService(context, { active: false });

      const response = await client
        .get(`/api/availability?serviceId=${service.id}&date=${date}`)
        .expect(409);

      expect(response.body.code).toBe(ApiErrorCode.SERVICE_INACTIVE);
    });

    it('does not list a disabled service publicly', async () => {
      await createService(context, { name: 'Visible', active: true });
      await createService(context, { name: 'Hidden', active: false });

      const response = await client.get('/api/services').expect(200);
      const names = (response.body as Array<{ name: string }>).map((item) => item.name);

      expect(names).toContain('Visible');
      expect(names).not.toContain('Hidden');
    });
  });

  describe('input validation', () => {
    beforeEach(async () => {
      await createSettings(context);
      await createWorkingHours(context);
      service = await createService(context);
    });

    it('rejects a malformed date', async () => {
      await client.get(`/api/availability?serviceId=${service.id}&date=01-09-2026`).expect(400);
      await client.get(`/api/availability?serviceId=${service.id}&date=tomorrow`).expect(400);
    });

    it('rejects a malformed service id', async () => {
      await client.get(`/api/availability?serviceId=not-a-uuid&date=${date}`).expect(400);
    });

    it('requires both parameters', async () => {
      await client.get('/api/availability').expect(400);
      await client.get(`/api/availability?date=${date}`).expect(400);
      await client.get(`/api/availability?serviceId=${service.id}`).expect(400);
    });
  });

  describe('privacy', () => {
    it('exposes no customer information', async () => {
      await createSettings(context, { slotIntervalMinutes: 60 });
      await createWorkingHours(context, { openMinute: 9 * 60, closeMinute: 12 * 60 });
      service = await createService(context, { durationMinutes: 60 });

      await context.prisma.booking.create({
        data: {
          customerName: 'Very Private Person',
          customerPhone: '0888999888',
          customerEmail: 'private@example.com',
          notes: 'Sensitive note',
          serviceId: service.id,
          startTime: localInstant(context, date, 10),
          endTime: localInstant(context, date, 11),
        },
      });

      const response = await client
        .get(`/api/availability?serviceId=${service.id}&date=${date}`)
        .expect(200);
      const body = JSON.stringify(response.body);

      expect(body).not.toContain('Very Private Person');
      expect(body).not.toContain('0888999888');
      expect(body).not.toContain('private@example.com');
      expect(body).not.toContain('Sensitive note');
    });
  });

  describe('calendar', () => {
    it('marks only the days the shop is open as available', async () => {
      await createSettings(context);
      // Open on exactly one weekday: the one the target date falls on.
      const isoWeekday = new Date(`${date}T12:00:00Z`).getUTCDay() || 7;
      await createWorkingHours(context, { enabledDays: [isoWeekday] });
      service = await createService(context);

      const response = await client
        .get(`/api/availability/calendar?serviceId=${service.id}&from=${date}&days=7`)
        .expect(200);

      const days = response.body.days as Array<{ date: string; hasAvailability: boolean }>;
      expect(days).toHaveLength(7);
      expect(days[0]!.date).toBe(date);

      // Within a seven day window starting on the open weekday, only the first
      // day can be open.
      expect(days.filter((day) => day.hasAvailability).map((day) => day.date)).toEqual([date]);
    });

    it('marks a fully booked open day as unavailable', async () => {
      await createSettings(context, { slotIntervalMinutes: 60 });
      await createWorkingHours(context, { openMinute: 9 * 60, closeMinute: 10 * 60 });
      service = await createService(context, { durationMinutes: 60 });

      await context.prisma.booking.create({
        data: {
          customerName: 'Only slot taken',
          customerPhone: '0888000000',
          serviceId: service.id,
          startTime: localInstant(context, date, 9),
          endTime: localInstant(context, date, 10),
        },
      });

      const response = await client
        .get(`/api/availability/calendar?serviceId=${service.id}&from=${date}&days=1`)
        .expect(200);

      expect(response.body.days).toEqual([{ date, hasAvailability: false }]);
    });

    it('caps the requested range', async () => {
      await createSettings(context);
      await createWorkingHours(context);
      service = await createService(context);

      await client.get(`/api/availability/calendar?serviceId=${service.id}&days=500`).expect(400);
    });
  });
});
