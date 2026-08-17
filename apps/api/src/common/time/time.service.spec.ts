import { Weekday } from '@booking/shared';
import { AppConfig } from '../../config/app-config';
import { ApiException } from '../errors/api-exception';
import { TimeService } from './time.service';

/**
 * Europe/Sofia is UTC+2 in winter and UTC+3 in summer. In 2026 the clocks move
 * forward on 29 March and back on 25 October, both at 03:00 local time. These
 * tests pin the behaviour that makes "we open at 09:00" mean 09:00 all year.
 */
const SOFIA = 'Europe/Sofia';

function buildTimeService(timezone = SOFIA): TimeService {
  const config = new AppConfig({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    APP_URL: 'http://localhost:5173',
    SESSION_SECRET: 'a'.repeat(48),
    BUSINESS_TIMEZONE: timezone,
  });

  return new TimeService(config);
}

describe('TimeService', () => {
  const time = buildTimeService();

  describe('instantAtLocalMinute', () => {
    it('resolves winter wall-clock time at UTC+2', () => {
      const instant = time.instantAtLocalMinute('2026-01-15', 9 * 60);
      expect(instant.toISOString()).toBe('2026-01-15T07:00:00.000Z');
    });

    it('resolves summer wall-clock time at UTC+3', () => {
      const instant = time.instantAtLocalMinute('2026-07-15', 9 * 60);
      expect(instant.toISOString()).toBe('2026-07-15T06:00:00.000Z');
    });

    it('keeps opening time at 09:00 local on the day the clocks go forward', () => {
      const instant = time.instantAtLocalMinute('2026-03-29', 9 * 60);
      // Already on summer time by 09:00, so UTC+3.
      expect(instant.toISOString()).toBe('2026-03-29T06:00:00.000Z');
      expect(time.localTimeLabel(instant)).toBe('09:00');
    });

    it('keeps opening time at 09:00 local on the day the clocks go back', () => {
      const instant = time.instantAtLocalMinute('2026-10-25', 9 * 60);
      // Back on winter time by 09:00, so UTC+2.
      expect(instant.toISOString()).toBe('2026-10-25T07:00:00.000Z');
      expect(time.localTimeLabel(instant)).toBe('09:00');
    });

    it('treats a minute offset of a full day as the following midnight', () => {
      const instant = time.instantAtLocalMinute('2026-07-15', 24 * 60);
      expect(instant.toISOString()).toBe('2026-07-15T21:00:00.000Z');
      expect(time.localDateOf(instant)).toBe('2026-07-16');
    });

    it('never produces a time on a different local date for in-day offsets', () => {
      for (const date of ['2026-01-15', '2026-03-29', '2026-07-15', '2026-10-25']) {
        for (const minute of [0, 9 * 60, 13 * 60 + 30, 23 * 60 + 59]) {
          expect(time.localDateOf(time.instantAtLocalMinute(date, minute))).toBe(date);
        }
      }
    });
  });

  describe('localDayBounds', () => {
    it('spans 24 hours on an ordinary day', () => {
      const { start, end } = time.localDayBounds('2026-07-15');
      expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
    });

    it('spans 23 hours on the day the clocks go forward', () => {
      const { start, end } = time.localDayBounds('2026-03-29');
      expect(end.getTime() - start.getTime()).toBe(23 * 60 * 60 * 1000);
    });

    it('spans 25 hours on the day the clocks go back', () => {
      const { start, end } = time.localDayBounds('2026-10-25');
      expect(end.getTime() - start.getTime()).toBe(25 * 60 * 60 * 1000);
    });

    it('starts at local midnight', () => {
      const { start } = time.localDayBounds('2026-07-15');
      expect(start.toISOString()).toBe('2026-07-14T21:00:00.000Z');
    });
  });

  describe('weekdayOf', () => {
    it('uses ISO numbering with Monday as 1', () => {
      expect(time.weekdayOf('2026-08-17')).toBe(Weekday.MONDAY);
      expect(time.weekdayOf('2026-08-22')).toBe(Weekday.SATURDAY);
      expect(time.weekdayOf('2026-08-23')).toBe(Weekday.SUNDAY);
    });
  });

  describe('addLocalDays', () => {
    it('adds calendar days rather than fixed durations across a clock change', () => {
      expect(time.addLocalDays('2026-03-28', 1)).toBe('2026-03-29');
      expect(time.addLocalDays('2026-03-29', 1)).toBe('2026-03-30');
      expect(time.addLocalDays('2026-10-24', 2)).toBe('2026-10-26');
    });

    it('handles month and year boundaries', () => {
      expect(time.addLocalDays('2026-01-31', 1)).toBe('2026-02-01');
      expect(time.addLocalDays('2026-12-31', 1)).toBe('2027-01-01');
    });
  });

  describe('parseIsoDate', () => {
    it('accepts a well-formed date', () => {
      expect(time.parseIsoDate('2026-09-01')).toBe('2026-09-01');
    });

    it('rejects other formats', () => {
      expect(() => time.parseIsoDate('01-09-2026')).toThrow(ApiException);
      expect(() => time.parseIsoDate('2026-9-1')).toThrow(ApiException);
      expect(() => time.parseIsoDate('tomorrow')).toThrow(ApiException);
      expect(() => time.parseIsoDate('')).toThrow(ApiException);
    });

    it('rejects impossible dates', () => {
      expect(() => time.parseIsoDate('2026-02-30')).toThrow(ApiException);
      expect(() => time.parseIsoDate('2026-13-01')).toThrow(ApiException);
    });
  });

  describe('parseInstant', () => {
    it('preserves the absolute instant regardless of the offset used', () => {
      const fromUtc = time.parseInstant('2026-09-01T07:00:00.000Z');
      const fromLocal = time.parseInstant('2026-09-01T10:00:00+03:00');
      expect(fromLocal.getTime()).toBe(fromUtc.getTime());
    });

    it('rejects malformed input', () => {
      expect(() => time.parseInstant('not-a-date')).toThrow(ApiException);
    });
  });

  describe('localTimeLabel', () => {
    it('renders in the business timezone, not UTC', () => {
      const label = time.localTimeLabel(new Date('2026-07-15T06:30:00.000Z'));
      expect(label).toBe('09:30');
    });
  });

  it('reports the configured timezone', () => {
    expect(time.zone).toBe(SOFIA);
    expect(buildTimeService('UTC').zone).toBe('UTC');
  });
});
