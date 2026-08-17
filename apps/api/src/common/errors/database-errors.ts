/**
 * Helpers for recognising PostgreSQL constraint violations.
 *
 * Prisma surfaces database errors differently depending on whether the failure
 * is one it models explicitly (unique constraints) or one it merely passes
 * through from the driver (our exclusion constraint). Rather than depend on a
 * single error shape, these helpers inspect the whole error chain.
 */

const EXCLUSION_VIOLATION = '23P01';
const UNIQUE_VIOLATION = '23505';
const CHECK_VIOLATION = '23514';

function collectErrorText(error: unknown, depth = 0): string {
  if (depth > 5 || error === null || error === undefined) {
    return '';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'number' || typeof error === 'boolean' || typeof error === 'bigint') {
    return error.toString();
  }

  if (typeof error !== 'object') {
    return '';
  }

  const candidate = error as Record<string, unknown>;
  const parts: string[] = [];

  for (const key of ['code', 'message', 'detail', 'constraint', 'meta']) {
    const value = candidate[key];
    if (typeof value === 'string') {
      parts.push(value);
    } else if (value && typeof value === 'object') {
      parts.push(collectErrorText(value, depth + 1));
    }
  }

  if ('cause' in candidate) {
    parts.push(collectErrorText(candidate.cause, depth + 1));
  }

  return parts.join(' | ');
}

/** True when the failure is our `booking_no_overlap` exclusion constraint. */
export function isOverlapViolation(error: unknown): boolean {
  const text = collectErrorText(error);
  return text.includes(EXCLUSION_VIOLATION) || text.includes('booking_no_overlap');
}

export function isUniqueViolation(error: unknown): boolean {
  const text = collectErrorText(error);
  return text.includes(UNIQUE_VIOLATION) || text.includes('P2002');
}

export function isCheckViolation(error: unknown): boolean {
  return collectErrorText(error).includes(CHECK_VIOLATION);
}

export function isRecordNotFound(error: unknown): boolean {
  return collectErrorText(error).includes('P2025');
}
