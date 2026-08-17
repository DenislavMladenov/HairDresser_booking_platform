import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BookingStatus } from '../generated/prisma/enums';
import {
  allowedTransitionsFrom,
  canTransition,
  occupiesSlot,
  SLOT_OCCUPYING_STATUSES,
} from './booking-status';

describe('booking status transitions', () => {
  it('lets a pending appointment move to any resolved state', () => {
    expect(canTransition(BookingStatus.PENDING, BookingStatus.CONFIRMED)).toBe(true);
    expect(canTransition(BookingStatus.PENDING, BookingStatus.CANCELLED)).toBe(true);
    expect(canTransition(BookingStatus.PENDING, BookingStatus.COMPLETED)).toBe(true);
    expect(canTransition(BookingStatus.PENDING, BookingStatus.NO_SHOW)).toBe(true);
  });

  it('does not let a confirmed appointment go back to pending', () => {
    expect(canTransition(BookingStatus.CONFIRMED, BookingStatus.PENDING)).toBe(false);
    expect(canTransition(BookingStatus.CONFIRMED, BookingStatus.COMPLETED)).toBe(true);
    expect(canTransition(BookingStatus.CONFIRMED, BookingStatus.CANCELLED)).toBe(true);
    expect(canTransition(BookingStatus.CONFIRMED, BookingStatus.NO_SHOW)).toBe(true);
  });

  it('treats completed, cancelled and no-show as final', () => {
    for (const terminal of [
      BookingStatus.COMPLETED,
      BookingStatus.CANCELLED,
      BookingStatus.NO_SHOW,
    ]) {
      expect(allowedTransitionsFrom(terminal)).toEqual([]);

      for (const target of Object.values(BookingStatus)) {
        expect(canTransition(terminal, target)).toBe(false);
      }
    }
  });

  it('never reports a transition to the same status as allowed', () => {
    for (const status of Object.values(BookingStatus)) {
      expect(canTransition(status, status)).toBe(false);
    }
  });
});

describe('slot occupancy', () => {
  it('counts pending, confirmed and completed appointments as occupying their slot', () => {
    expect(occupiesSlot(BookingStatus.PENDING)).toBe(true);
    expect(occupiesSlot(BookingStatus.CONFIRMED)).toBe(true);
    expect(occupiesSlot(BookingStatus.COMPLETED)).toBe(true);
  });

  it('frees the slot for cancelled and no-show appointments', () => {
    expect(occupiesSlot(BookingStatus.CANCELLED)).toBe(false);
    expect(occupiesSlot(BookingStatus.NO_SHOW)).toBe(false);
  });

  /**
   * The application and the exclusion constraint must agree on which statuses
   * block a slot. If they drift apart, availability and the database would
   * disagree, so the migration is parsed and compared rather than trusted.
   */
  it('matches the WHERE clause of the booking_no_overlap constraint', () => {
    const migrationsDir = join(__dirname, '..', '..', 'prisma', 'migrations');
    const statements = readdirSync(migrationsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => readFileSync(join(migrationsDir, entry.name, 'migration.sql'), 'utf8'))
      .join('\n');

    const constraint = /EXCLUDE USING gist[\s\S]*?WHERE \(([\s\S]*?)\);/.exec(statements);
    expect(constraint).not.toBeNull();

    const predicate = constraint![1]!;

    for (const status of Object.values(BookingStatus)) {
      const mentioned = predicate.includes(`'${status}'`);
      expect(mentioned).toBe(SLOT_OCCUPYING_STATUSES.includes(status));
    }
  });
});
