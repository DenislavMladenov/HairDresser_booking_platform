import { calculateAvailableSlots, intervalsOverlap, type SlotCalculationInput } from './slot-calculator';

/**
 * The calculator is deliberately free of clocks and timezones, so these tests
 * describe the booking rules in isolation. A fixed reference day is used and
 * minute offsets are resolved as plain arithmetic; daylight saving behaviour is
 * covered separately in the TimeService tests.
 */
const DAY_START_MS = Date.UTC(2026, 8, 1, 0, 0, 0); // 2026-09-01T00:00:00Z
const MINUTE = 60_000;

/** Simple resolver: minute offset from the start of the reference day. */
const linearResolver = (minuteOfDay: number): number => DAY_START_MS + minuteOfDay * MINUTE;

function at(hour: number, minute = 0): number {
  return DAY_START_MS + (hour * 60 + minute) * MINUTE;
}

function buildInput(overrides: Partial<SlotCalculationInput> = {}): SlotCalculationInput {
  return {
    openMinute: 9 * 60,
    closeMinute: 18 * 60,
    breaks: [],
    busy: [],
    serviceDurationMinutes: 30,
    slotIntervalMinutes: 30,
    earliestStartMs: Number.NEGATIVE_INFINITY,
    latestStartMs: Number.POSITIVE_INFINITY,
    resolveMinute: linearResolver,
    ...overrides,
  };
}

function labelsOf(slots: Array<{ startMs: number }>): string[] {
  return slots.map((slot) => new Date(slot.startMs).toISOString().slice(11, 16));
}

describe('intervalsOverlap', () => {
  it('treats touching intervals as non-overlapping', () => {
    expect(intervalsOverlap(0, 10, 10, 20)).toBe(false);
    expect(intervalsOverlap(10, 20, 0, 10)).toBe(false);
  });

  it('detects partial and full overlap', () => {
    expect(intervalsOverlap(0, 10, 5, 15)).toBe(true);
    expect(intervalsOverlap(5, 15, 0, 10)).toBe(true);
    expect(intervalsOverlap(0, 30, 10, 20)).toBe(true);
    expect(intervalsOverlap(10, 20, 0, 30)).toBe(true);
  });
});

describe('calculateAvailableSlots', () => {
  it('offers slots aligned to the opening time', () => {
    const slots = calculateAvailableSlots(
      buildInput({ openMinute: 9 * 60, closeMinute: 11 * 60, slotIntervalMinutes: 15 }),
    );

    expect(labelsOf(slots)).toEqual(['09:00', '09:15', '09:30', '09:45', '10:00', '10:15', '10:30']);
  });

  it('never offers a slot that would run past closing time', () => {
    const slots = calculateAvailableSlots(
      buildInput({
        openMinute: 9 * 60,
        closeMinute: 10 * 60,
        serviceDurationMinutes: 45,
        slotIntervalMinutes: 15,
      }),
    );

    // 09:00 and 09:15 fit before 10:00; 09:30 would end at 10:15.
    expect(labelsOf(slots)).toEqual(['09:00', '09:15']);
  });

  it('returns nothing when the service is longer than the working day', () => {
    const slots = calculateAvailableSlots(
      buildInput({ openMinute: 9 * 60, closeMinute: 10 * 60, serviceDurationMinutes: 120 }),
    );

    expect(slots).toEqual([]);
  });

  it('excludes candidates that overlap a break', () => {
    const slots = calculateAvailableSlots(
      buildInput({
        openMinute: 12 * 60,
        closeMinute: 15 * 60,
        slotIntervalMinutes: 30,
        serviceDurationMinutes: 30,
        breaks: [{ startMinute: 13 * 60, endMinute: 14 * 60 }],
      }),
    );

    expect(labelsOf(slots)).toEqual(['12:00', '12:30', '14:00', '14:30']);
  });

  it('excludes a candidate that only partially overlaps a break', () => {
    const slots = calculateAvailableSlots(
      buildInput({
        openMinute: 12 * 60,
        closeMinute: 14 * 60,
        slotIntervalMinutes: 15,
        serviceDurationMinutes: 30,
        breaks: [{ startMinute: 13 * 60, endMinute: 13 * 60 + 30 }],
      }),
    );

    // 12:45 would run into the break, 13:30 starts exactly when it ends.
    expect(labelsOf(slots)).toEqual(['12:00', '12:15', '12:30', '13:30']);
  });

  it('excludes candidates that overlap a busy interval', () => {
    const slots = calculateAvailableSlots(
      buildInput({
        openMinute: 9 * 60,
        closeMinute: 12 * 60,
        busy: [{ startMs: at(10), endMs: at(11) }],
      }),
    );

    expect(labelsOf(slots)).toEqual(['09:00', '09:30', '11:00', '11:30']);
  });

  it('allows a slot starting exactly when a booking ends', () => {
    const slots = calculateAvailableSlots(
      buildInput({
        openMinute: 9 * 60,
        closeMinute: 10 * 60,
        busy: [{ startMs: at(9), endMs: at(9, 30) }],
      }),
    );

    expect(labelsOf(slots)).toEqual(['09:30']);
  });

  it('respects the earliest acceptable start, which carries the lead time', () => {
    const slots = calculateAvailableSlots(
      buildInput({ openMinute: 9 * 60, closeMinute: 12 * 60, earliestStartMs: at(10, 15) }),
    );

    expect(labelsOf(slots)).toEqual(['10:30', '11:00', '11:30']);
  });

  it('respects the latest acceptable start, which carries the booking horizon', () => {
    const slots = calculateAvailableSlots(
      buildInput({ openMinute: 9 * 60, closeMinute: 12 * 60, latestStartMs: at(10, 0) }),
    );

    expect(labelsOf(slots)).toEqual(['09:00', '09:30', '10:00']);
  });

  it('measures duration as elapsed time rather than wall-clock time', () => {
    // Resolver simulating a one hour jump forward at 03:00: every wall-clock
    // minute after the transition maps an hour earlier in absolute terms.
    const shiftingResolver = (minuteOfDay: number): number =>
      DAY_START_MS + (minuteOfDay >= 180 ? minuteOfDay - 60 : minuteOfDay) * MINUTE;

    const slots = calculateAvailableSlots(
      buildInput({
        openMinute: 9 * 60,
        closeMinute: 10 * 60,
        serviceDurationMinutes: 30,
        slotIntervalMinutes: 30,
        resolveMinute: shiftingResolver,
      }),
    );

    expect(slots).toHaveLength(2);
    for (const slot of slots) {
      expect(slot.endMs - slot.startMs).toBe(30 * MINUTE);
    }
  });

  it('rejects nonsensical configuration instead of looping forever', () => {
    expect(calculateAvailableSlots(buildInput({ serviceDurationMinutes: 0 }))).toEqual([]);
    expect(calculateAvailableSlots(buildInput({ serviceDurationMinutes: -30 }))).toEqual([]);
    expect(calculateAvailableSlots(buildInput({ slotIntervalMinutes: 0 }))).toEqual([]);
    expect(calculateAvailableSlots(buildInput({ slotIntervalMinutes: -15 }))).toEqual([]);
  });

  it('returns nothing when the day is closed, expressed as an empty window', () => {
    expect(
      calculateAvailableSlots(buildInput({ openMinute: 9 * 60, closeMinute: 9 * 60 })),
    ).toEqual([]);
  });

  it('reports the end of each slot as start plus duration', () => {
    const slots = calculateAvailableSlots(
      buildInput({ openMinute: 9 * 60, closeMinute: 10 * 60, serviceDurationMinutes: 20 }),
    );

    expect(slots[0]).toEqual({ startMs: at(9), endMs: at(9, 20) });
  });
});
