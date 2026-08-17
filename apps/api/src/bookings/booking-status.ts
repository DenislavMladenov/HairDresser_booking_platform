import { BookingStatus } from '../generated/prisma/enums';

/**
 * Statuses that occupy their time slot.
 *
 * This list must stay identical to the WHERE clause of the `booking_no_overlap`
 * exclusion constraint in
 * prisma/migrations/20260817133000_booking_integrity_constraints/migration.sql.
 * If they drift apart, the application and the database would disagree about
 * which appointments block a slot.
 */
export const SLOT_OCCUPYING_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.COMPLETED,
];

/** Which status changes the barber is allowed to make. */
const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED, BookingStatus.COMPLETED, BookingStatus.NO_SHOW],
  CONFIRMED: [BookingStatus.COMPLETED, BookingStatus.CANCELLED, BookingStatus.NO_SHOW],
  // Terminal states. Reopening one would need an overlap check, and in practice
  // the barber creates a new appointment instead.
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function allowedTransitionsFrom(status: BookingStatus): BookingStatus[] {
  return ALLOWED_TRANSITIONS[status];
}

export function occupiesSlot(status: BookingStatus): boolean {
  return SLOT_OCCUPYING_STATUSES.includes(status);
}
