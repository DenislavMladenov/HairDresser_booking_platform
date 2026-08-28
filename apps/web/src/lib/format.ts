import { DateTime } from 'luxon';

/**
 * Display helpers. Every timestamp from the API is an absolute instant, so all
 * rendering goes through the business timezone rather than the visitor's own,
 * otherwise a customer travelling abroad would see the wrong opening hours.
 */
export const BUSINESS_TIMEZONE = 'Europe/Sofia';

/**
 * Module-level rather than a parameter on every function below, because these
 * helpers are called from roughly twenty places and the active language rarely
 * changes more than once per session. `LanguageProvider` calls this whenever the
 * user toggles the language.
 */
let activeLocale: 'bg' | 'en' = 'bg';

export function setActiveLocale(locale: 'bg' | 'en'): void {
  activeLocale = locale;
}

function luxonLocale(): string {
  return activeLocale === 'bg' ? 'bg' : 'en-GB';
}

export function formatMoney(amount: string, currency: string): string {
  const value = Number(amount);

  if (Number.isNaN(value)) {
    return `${amount} ${currency}`;
  }

  return `${value.toFixed(2)} ${currency}`;
}

export function formatTime(isoDateTime: string, timezone = BUSINESS_TIMEZONE): string {
  return DateTime.fromISO(isoDateTime).setZone(timezone).toFormat('HH:mm');
}

export function formatTimeRange(
  startIso: string,
  endIso: string,
  timezone = BUSINESS_TIMEZONE,
): string {
  return `${formatTime(startIso, timezone)} - ${formatTime(endIso, timezone)}`;
}

/** "Tuesday, 1 September" (or its Bulgarian equivalent) */
export function formatDateLong(isoDate: string, timezone = BUSINESS_TIMEZONE): string {
  return DateTime.fromISO(isoDate, { zone: timezone }).setLocale(luxonLocale()).toFormat('cccc, d LLLL');
}

/** "Tue 1 Sep" (or its Bulgarian equivalent) */
export function formatDateShort(isoDate: string, timezone = BUSINESS_TIMEZONE): string {
  return DateTime.fromISO(isoDate, { zone: timezone }).setLocale(luxonLocale()).toFormat('ccc d LLL');
}

export function formatDateTimeLong(isoDateTime: string, timezone = BUSINESS_TIMEZONE): string {
  return DateTime.fromISO(isoDateTime)
    .setZone(timezone)
    .setLocale(luxonLocale())
    .toFormat('cccc, d LLLL, HH:mm');
}

export function formatWeekdayName(isoDate: string, timezone = BUSINESS_TIMEZONE): string {
  return DateTime.fromISO(isoDate, { zone: timezone }).setLocale(luxonLocale()).toFormat('ccc');
}

export function formatDayOfMonth(isoDate: string, timezone = BUSINESS_TIMEZONE): string {
  return DateTime.fromISO(isoDate, { zone: timezone }).toFormat('d');
}

export function formatDuration(minutes: number): string {
  const [minuteUnit, hourUnit] = activeLocale === 'bg' ? ['мин', 'ч'] : ['min', 'h'];

  if (minutes < 60) {
    return `${minutes} ${minuteUnit}`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest === 0 ? `${hours} ${hourUnit}` : `${hours} ${hourUnit} ${rest} ${minuteUnit}`;
}

/** Minute offset from local midnight rendered as HH:mm, for working hours. */
export function formatMinuteOfDay(minute: number): string {
  const hours = Math.floor(minute / 60);
  return `${String(hours).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}

export function todayIsoDate(timezone = BUSINESS_TIMEZONE): string {
  return DateTime.now().setZone(timezone).toISODate() ?? '';
}

export function addDays(isoDate: string, days: number, timezone = BUSINESS_TIMEZONE): string {
  return DateTime.fromISO(isoDate, { zone: timezone }).plus({ days }).toISODate() ?? isoDate;
}

/** "August 2026" (or its Bulgarian equivalent) */
export function formatMonthYear(isoDate: string, timezone = BUSINESS_TIMEZONE): string {
  return DateTime.fromISO(isoDate, { zone: timezone }).setLocale(luxonLocale()).toFormat('LLLL yyyy');
}

export function startOfMonth(isoDate: string, timezone = BUSINESS_TIMEZONE): string {
  return DateTime.fromISO(isoDate, { zone: timezone }).startOf('month').toISODate() ?? isoDate;
}

/** Always lands on the 1st, so paging months never drifts onto a short month. */
export function addMonths(isoDate: string, months: number, timezone = BUSINESS_TIMEZONE): string {
  return (
    DateTime.fromISO(isoDate, { zone: timezone }).plus({ months }).startOf('month').toISODate() ??
    isoDate
  );
}

export function daysInMonth(isoDate: string, timezone = BUSINESS_TIMEZONE): number {
  return DateTime.fromISO(isoDate, { zone: timezone }).daysInMonth ?? 30;
}

/** Monday-first weekday index: 0 for Monday through 6 for Sunday. */
export function mondayIndex(isoDate: string, timezone = BUSINESS_TIMEZONE): number {
  return DateTime.fromISO(isoDate, { zone: timezone }).weekday - 1;
}

export function daysBetween(startIso: string, endIso: string, timezone = BUSINESS_TIMEZONE): number {
  const start = DateTime.fromISO(startIso, { zone: timezone });
  const end = DateTime.fromISO(endIso, { zone: timezone });
  return Math.round(end.diff(start, 'days').days);
}

export function isPast(isoDateTime: string): boolean {
  return DateTime.fromISO(isoDateTime) < DateTime.now();
}

export function isToday(isoDate: string, timezone = BUSINESS_TIMEZONE): boolean {
  return isoDate === todayIsoDate(timezone);
}
