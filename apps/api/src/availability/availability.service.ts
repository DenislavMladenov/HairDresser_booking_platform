import { Injectable } from '@nestjs/common';
import type {
  AvailabilityCalendarResponse,
  AvailabilityResponse,
  AvailabilitySlot,
  Weekday,
} from '@booking/shared';
import { ApiException } from '../common/errors/api-exception';
import { TimeService } from '../common/time/time.service';
import { PrismaService } from '../prisma/prisma.service';
import { ServiceCatalogService } from '../services/service-catalog.service';
import { SettingsService, type BookingPolicy } from '../settings/settings.service';
import { WorkingHoursService, type DaySchedule } from '../working-hours/working-hours.service';
import { SLOT_OCCUPYING_STATUSES } from '../bookings/booking-status';
import { calculateAvailableSlots, type AbsoluteInterval } from './slot-calculator';

/** Everything needed to compute availability for a range of days. */
interface AvailabilityContext {
  policy: BookingPolicy;
  schedules: Map<Weekday, DaySchedule>;
  busy: AbsoluteInterval[];
  nowMs: number;
}

const MAX_CALENDAR_DAYS = 62;

/**
 * The single source of truth for what a customer may book. The frontend only
 * renders what this service returns; it never decides availability itself.
 */
@Injectable()
export class AvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly time: TimeService,
    private readonly catalog: ServiceCatalogService,
    private readonly workingHours: WorkingHoursService,
    private readonly settings: SettingsService,
  ) {}

  async getDay(serviceId: string, date: string): Promise<AvailabilityResponse> {
    const service = await this.catalog.getBookableOrThrow(serviceId);
    const isoDate = this.time.parseIsoDate(date);
    const { start, end } = this.time.localDayBounds(isoDate);

    const context = await this.loadContext(start, end);
    const slots = this.slotsForDay(isoDate, service.durationMinutes, context);

    return {
      date: isoDate,
      serviceId: service.id,
      timezone: this.time.zone,
      durationMinutes: service.durationMinutes,
      slots: slots.map((slot) => this.toSlotDto(slot)),
    };
  }

  /**
   * Which of the next days have at least one free slot, so the date picker can
   * grey out days that are fully booked or closed.
   */
  async getCalendar(
    serviceId: string,
    fromDate: string | undefined,
    days: number,
  ): Promise<AvailabilityCalendarResponse> {
    const service = await this.catalog.getBookableOrThrow(serviceId);
    const startDate = fromDate ? this.time.parseIsoDate(fromDate) : this.time.todayIsoDate();
    const dayCount = Math.min(Math.max(days, 1), MAX_CALENDAR_DAYS);
    const endDate = this.time.addLocalDays(startDate, dayCount);

    const context = await this.loadContext(
      this.time.localDayBounds(startDate).start,
      this.time.localDayBounds(endDate).start,
    );

    const result: AvailabilityCalendarResponse['days'] = [];

    for (let offset = 0; offset < dayCount; offset += 1) {
      const date = this.time.addLocalDays(startDate, offset);
      const slots = this.slotsForDay(date, service.durationMinutes, context);
      result.push({ date, hasAvailability: slots.length > 0 });
    }

    return { timezone: this.time.zone, serviceId: service.id, days: result };
  }

  /**
   * Confirms that a specific start time is one the system actually offers.
   *
   * Reusing the slot calculation here means a customer can never book a time
   * that was never advertised: off-grid starts, times inside a break, times
   * outside working hours and times too close to now are all rejected.
   */
  async assertBookable(serviceId: string, startTime: Date): Promise<void> {
    const service = await this.catalog.getBookableOrThrow(serviceId);
    const isoDate = this.time.localDateOf(startTime);
    const { start, end } = this.time.localDayBounds(isoDate);

    const context = await this.loadContext(start, end);
    const slots = this.slotsForDay(isoDate, service.durationMinutes, context);
    const requestedMs = startTime.getTime();

    if (!slots.some((slot) => slot.startMs === requestedMs)) {
      throw ApiException.slotUnavailable(
        'That time is no longer available. Please pick another slot.',
      );
    }
  }

  private async loadContext(rangeStart: Date, rangeEnd: Date): Promise<AvailabilityContext> {
    const [policy, schedules, bookings, blocked] = await Promise.all([
      this.settings.getPolicy(),
      this.workingHours.getWeekSchedules(),
      this.prisma.booking.findMany({
        where: {
          status: { in: SLOT_OCCUPYING_STATUSES },
          startTime: { lt: rangeEnd },
          endTime: { gt: rangeStart },
        },
        select: { startTime: true, endTime: true },
      }),
      this.prisma.blockedTime.findMany({
        where: { startTime: { lt: rangeEnd }, endTime: { gt: rangeStart } },
        select: { startTime: true, endTime: true },
      }),
    ]);

    const busy: AbsoluteInterval[] = [...bookings, ...blocked].map((row) => ({
      startMs: row.startTime.getTime(),
      endMs: row.endTime.getTime(),
    }));

    return { policy, schedules, busy, nowMs: Date.now() };
  }

  private slotsForDay(
    isoDate: string,
    durationMinutes: number,
    context: AvailabilityContext,
  ): AbsoluteInterval[] {
    const schedule = context.schedules.get(this.time.weekdayOf(isoDate));

    if (!schedule) {
      return [];
    }

    const earliestStartMs = context.nowMs + context.policy.minLeadTimeMinutes * 60_000;
    const latestStartMs = this.time
      .startOfLocalDay(
        this.time.addLocalDays(this.time.todayIsoDate(), context.policy.maxAdvanceDays),
      )
      .toMillis();

    return calculateAvailableSlots({
      openMinute: schedule.openMinute,
      closeMinute: schedule.closeMinute,
      breaks: schedule.breaks,
      busy: context.busy,
      serviceDurationMinutes: durationMinutes,
      slotIntervalMinutes: context.policy.slotIntervalMinutes,
      earliestStartMs,
      latestStartMs,
      resolveMinute: (minuteOfDay) =>
        this.time.instantAtLocalMinute(isoDate, minuteOfDay).getTime(),
    });
  }

  private toSlotDto(slot: AbsoluteInterval): AvailabilitySlot {
    const start = new Date(slot.startMs);

    return {
      startTime: start.toISOString(),
      endTime: new Date(slot.endMs).toISOString(),
      label: this.time.localTimeLabel(start),
    };
  }
}
