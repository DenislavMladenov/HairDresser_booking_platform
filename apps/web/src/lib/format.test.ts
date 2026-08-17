import { describe, expect, it } from 'vitest';
import {
  addDays,
  formatDateLong,
  formatDuration,
  formatMinuteOfDay,
  formatMoney,
  formatTime,
  formatTimeRange,
} from './format';

/**
 * These helpers decide what the customer reads. The timezone cases matter most:
 * an instant must always render in the shop's timezone, never the visitor's.
 */
describe('formatMoney', () => {
  it('shows two decimal places with the currency', () => {
    expect(formatMoney('25', 'BGN')).toBe('25.00 BGN');
    expect(formatMoney('25.5', 'BGN')).toBe('25.50 BGN');
    expect(formatMoney('25.00', 'EUR')).toBe('25.00 EUR');
  });

  it('passes through anything that is not a number', () => {
    expect(formatMoney('free', 'BGN')).toBe('free BGN');
  });
});

describe('formatTime', () => {
  it('renders a UTC instant in the business timezone', () => {
    // 06:30 UTC is 09:30 in Sofia during summer time.
    expect(formatTime('2026-07-15T06:30:00.000Z')).toBe('09:30');
    // 07:30 UTC is 09:30 in Sofia during winter time.
    expect(formatTime('2026-01-15T07:30:00.000Z')).toBe('09:30');
  });

  it('honours an explicitly supplied timezone', () => {
    expect(formatTime('2026-07-15T06:30:00.000Z', 'UTC')).toBe('06:30');
  });
});

describe('formatTimeRange', () => {
  it('joins start and end', () => {
    expect(formatTimeRange('2026-07-15T06:00:00.000Z', '2026-07-15T06:30:00.000Z')).toBe(
      '09:00 - 09:30',
    );
  });
});

describe('formatDateLong', () => {
  it('names the weekday and month', () => {
    expect(formatDateLong('2026-09-01')).toBe('Tuesday, 1 September');
  });
});

describe('formatDuration', () => {
  it('uses minutes below an hour', () => {
    expect(formatDuration(20)).toBe('20 min');
    expect(formatDuration(45)).toBe('45 min');
  });

  it('uses hours at and above an hour', () => {
    expect(formatDuration(60)).toBe('1 h');
    expect(formatDuration(90)).toBe('1 h 30 min');
    expect(formatDuration(120)).toBe('2 h');
  });
});

describe('formatMinuteOfDay', () => {
  it('pads to HH:mm', () => {
    expect(formatMinuteOfDay(0)).toBe('00:00');
    expect(formatMinuteOfDay(9 * 60)).toBe('09:00');
    expect(formatMinuteOfDay(13 * 60 + 30)).toBe('13:30');
    expect(formatMinuteOfDay(23 * 60 + 59)).toBe('23:59');
  });
});

describe('addDays', () => {
  it('moves across month and daylight saving boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
    expect(addDays('2026-09-05', -5)).toBe('2026-08-31');
  });
});
