/**
 * Enums are declared as plain objects rather than TypeScript `enum` so the same
 * declaration can be consumed as a value and as a type on both sides of the API,
 * without either side importing Prisma's generated client.
 */
export const BookingStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
  NO_SHOW: 'NO_SHOW',
} as const;

export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const BOOKING_STATUSES = Object.values(BookingStatus);

/** Statuses that occupy a time slot. Cancelled and no-show bookings free their slot. */
export const ACTIVE_BOOKING_STATUSES = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.COMPLETED,
] as const satisfies readonly BookingStatus[];

export const Role = {
  ADMIN: 'ADMIN',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

/** ISO-8601 weekday numbering, matching Luxon's `DateTime.weekday`. */
export const Weekday = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 7,
} as const;

export type Weekday = (typeof Weekday)[keyof typeof Weekday];

export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const satisfies readonly Weekday[];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
};
