import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { MINUTES_IN_DAY, type Weekday } from '@booking/shared';
import { AppConfig } from '../../config/app-config';
import { ApiException } from '../errors/api-exception';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * All conversions between absolute instants and business-local wall time.
 *
 * Wall-clock fields are always set with Luxon's `set()` on a zoned DateTime
 * rather than by adding minutes to midnight. That distinction matters on
 * daylight saving days, where "midnight plus 540 minutes" and "09:00" are not
 * the same instant.
 */
@Injectable()
export class TimeService {
  constructor(private readonly config: AppConfig) {}

  get zone(): string {
    return this.config.timezone;
  }

  now(): DateTime {
    return DateTime.now().setZone(this.zone);
  }

  /** Today's date in the business timezone, as `yyyy-MM-dd`. */
  todayIsoDate(): string {
    return this.now().toISODate() as string;
  }

  /**
   * Resolves a minute-of-day offset on a given local date to an absolute
   * instant. A minute offset of 1440 means midnight at the start of the next day.
   */
  instantAtLocalMinute(isoDate: string, minuteOfDay: number): Date {
    const startOfDay = this.startOfLocalDay(isoDate);

    if (minuteOfDay >= MINUTES_IN_DAY) {
      return startOfDay
        .plus({ days: 1 })
        .startOf('day')
        .plus({ minutes: minuteOfDay - MINUTES_IN_DAY })
        .toJSDate();
    }

    return startOfDay
      .set({
        hour: Math.floor(minuteOfDay / 60),
        minute: minuteOfDay % 60,
        second: 0,
        millisecond: 0,
      })
      .toJSDate();
  }

  startOfLocalDay(isoDate: string): DateTime {
    return this.parseLocalDate(isoDate).startOf('day');
  }

  /** Half-open bounds `[start, end)` covering one local calendar day. */
  localDayBounds(isoDate: string): { start: Date; end: Date } {
    const start = this.startOfLocalDay(isoDate);
    return { start: start.toJSDate(), end: start.plus({ days: 1 }).toJSDate() };
  }

  localDateOf(instant: Date): string {
    return DateTime.fromJSDate(instant).setZone(this.zone).toISODate() as string;
  }

  /** `HH:mm` in the business timezone. */
  localTimeLabel(instant: Date): string {
    return DateTime.fromJSDate(instant).setZone(this.zone).toFormat('HH:mm');
  }

  weekdayOf(isoDate: string): Weekday {
    return this.parseLocalDate(isoDate).weekday as Weekday;
  }

  addLocalDays(isoDate: string, days: number): string {
    return this.parseLocalDate(isoDate).plus({ days }).toISODate() as string;
  }

  /** Validates and normalises a `yyyy-MM-dd` string. */
  parseIsoDate(value: string): string {
    if (!ISO_DATE_PATTERN.test(value)) {
      throw ApiException.badRequest('Date must be in YYYY-MM-DD format.');
    }

    const parsed = DateTime.fromISO(value, { zone: this.zone });

    if (!parsed.isValid) {
      throw ApiException.badRequest(`"${value}" is not a valid date.`);
    }

    return parsed.toISODate() as string;
  }

  /** Parses an absolute timestamp supplied by a client. */
  parseInstant(value: string): Date {
    const parsed = DateTime.fromISO(value, { setZone: true });

    if (!parsed.isValid) {
      throw ApiException.badRequest(`"${value}" is not a valid date and time.`);
    }

    return parsed.toJSDate();
  }

  private parseLocalDate(isoDate: string): DateTime {
    const parsed = DateTime.fromISO(isoDate, { zone: this.zone });

    if (!parsed.isValid) {
      throw ApiException.badRequest(`"${isoDate}" is not a valid date.`);
    }

    return parsed;
  }
}
