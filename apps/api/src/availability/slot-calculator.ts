/**
 * Pure slot arithmetic. No database, no clock, no timezone library: everything
 * it needs is supplied by the caller, which makes the rules straightforward to
 * unit test and impossible to accidentally couple to request handling.
 */

export interface AbsoluteInterval {
  startMs: number;
  endMs: number;
}

export interface MinuteInterval {
  startMinute: number;
  endMinute: number;
}

export interface SlotCalculationInput {
  /** Opening and closing time as minutes from local midnight. */
  openMinute: number;
  closeMinute: number;
  /** Recurring breaks, also in minutes from local midnight. */
  breaks: MinuteInterval[];
  /** Absolute intervals that are already taken: bookings and blocked periods. */
  busy: AbsoluteInterval[];
  serviceDurationMinutes: number;
  slotIntervalMinutes: number;
  /** Earliest acceptable start, normally now plus the minimum lead time. */
  earliestStartMs: number;
  /** Latest acceptable start, derived from how far ahead booking is open. */
  latestStartMs: number;
  /**
   * Converts a minute-of-day offset into an absolute instant. Injected so the
   * caller owns daylight saving handling.
   */
  resolveMinute: (minuteOfDay: number) => number;
}

export function intervalsOverlap(
  firstStart: number,
  firstEnd: number,
  secondStart: number,
  secondEnd: number,
): boolean {
  // Half-open comparison: touching intervals do not overlap, so an appointment
  // ending at 10:30 leaves 10:30 free. This mirrors the '[)' bounds used by the
  // database exclusion constraint.
  return firstStart < secondEnd && firstEnd > secondStart;
}

export function calculateAvailableSlots(input: SlotCalculationInput): AbsoluteInterval[] {
  const {
    openMinute,
    closeMinute,
    breaks,
    busy,
    serviceDurationMinutes,
    slotIntervalMinutes,
    earliestStartMs,
    latestStartMs,
    resolveMinute,
  } = input;

  if (serviceDurationMinutes <= 0 || slotIntervalMinutes <= 0) {
    return [];
  }

  const slots: AbsoluteInterval[] = [];
  const durationMs = serviceDurationMinutes * 60_000;

  // Candidate starts are aligned to the opening time, so a shop opening at 09:00
  // with a 15 minute interval offers 09:00, 09:15, 09:30 and so on.
  for (
    let startMinute = openMinute;
    startMinute + serviceDurationMinutes <= closeMinute;
    startMinute += slotIntervalMinutes
  ) {
    const endMinute = startMinute + serviceDurationMinutes;

    if (breaks.some((item) => intervalsOverlap(startMinute, endMinute, item.startMinute, item.endMinute))) {
      continue;
    }

    const startMs = resolveMinute(startMinute);
    // Duration is elapsed time, not wall-clock time, which keeps a 30 minute
    // appointment 30 real minutes long even across a clock change.
    const endMs = startMs + durationMs;

    if (startMs < earliestStartMs || startMs > latestStartMs) {
      continue;
    }

    if (busy.some((item) => intervalsOverlap(startMs, endMs, item.startMs, item.endMs))) {
      continue;
    }

    slots.push({ startMs, endMs });
  }

  return slots;
}
