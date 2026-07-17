/**
 * Retry schedule for notification outbox.
 * Pure function — no side effects — fully testable.
 *
 * Attempt 1 →  1 minute
 * Attempt 2 →  5 minutes
 * Attempt 3 → 30 minutes
 * Attempt 4 →  2 hours
 * Attempt 5 → 12 hours
 * > max → dead
 */

const DELAYS_MS: readonly number[] = [
  1   * 60 * 1000,   // 1 min
  5   * 60 * 1000,   // 5 min
  30  * 60 * 1000,   // 30 min
  2   * 60 * 60 * 1000,  // 2 h
  12  * 60 * 60 * 1000,  // 12 h
];

export const DEFAULT_MAX_ATTEMPTS = DELAYS_MS.length;

/**
 * Returns the delay in ms for a given 1-based attempt number.
 * If attempt exceeds the schedule, returns the last entry.
 */
export function retryDelayMs(attempt: number): number {
  const idx = Math.max(0, Math.min(attempt - 1, DELAYS_MS.length - 1));
  return DELAYS_MS[idx]!;
}

/**
 * Returns the Date for the next attempt, or null if attempts >= maxAttempts.
 * `attempts` is the number of attempts already made (0 = never tried).
 */
export function nextAttemptAt(
  attempts: number,
  maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
  now: Date = new Date()
): Date | null {
  if (attempts >= maxAttempts) return null;
  const delay = retryDelayMs(attempts + 1);
  return new Date(now.getTime() + delay);
}

/**
 * Returns true when a processing row's lock should be considered stale.
 * Stale = locked for more than 15 minutes.
 */
export function isLockStale(lockTime: Date, now: Date = new Date()): boolean {
  return now.getTime() - lockTime.getTime() > 15 * 60 * 1000;
}

/**
 * Returns the UTC Date corresponding to the next midnight in Asia/Tehran.
 * Used for scheduling the next retry when the daily SMS cap is exceeded.
 *
 * Algorithm: format `now` in Tehran locale to get today's date parts,
 * then derive the Tehran UTC offset and compute tomorrow midnight UTC.
 */
export function nextDayMidnightTehran(now: Date = new Date()): Date {
  // Get current Tehran date parts
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Tehran',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const get = (type: string): number =>
    parseInt(parts.find((p) => p.type === type)!.value, 10);

  const tY = get('year');
  const tM = get('month');
  const tD = get('day');
  const tH = get('hour');
  const tMin = get('minute');
  const tSec = get('second');

  // Compute Tehran UTC offset in ms (Tehran is ahead of UTC, so offset > 0)
  const tehranLocalMs = Date.UTC(tY, tM - 1, tD, tH, tMin, tSec);
  const offsetMs = tehranLocalMs - now.getTime();

  // Tomorrow midnight Tehran = Date.UTC(tY, tM-1, tD+1, 0, 0, 0) - offsetMs
  // Date.UTC handles month/year rollover automatically when day overflows
  return new Date(Date.UTC(tY, tM - 1, tD + 1) - offsetMs);
}
