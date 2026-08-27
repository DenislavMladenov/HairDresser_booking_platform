export const MINUTES_IN_DAY = 24 * 60;

/**
 * Formats a minute-of-day offset as `HH:mm`. This is plain arithmetic on a
 * wall-clock offset, not date maths, so it is safe to share between both sides.
 */
export function minuteOfDayToLabel(minute: number): string {
  const clamped = Math.max(0, Math.min(MINUTES_IN_DAY, Math.trunc(minute)));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
