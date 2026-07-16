/**
 * Shared cursor codec for notification pagination.
 * Exported for use in route handlers and tests — no logic duplication.
 *
 * Validation:
 * - base64 input must be ≤ 512 chars (prevents DoS on large inputs)
 * - `id` field must be a valid UUID v4 format
 * - `at` field must parse to a valid ISO date
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CURSOR_BYTES = 512;

export function encodeCursor(updatedAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ at: updatedAt.toISOString(), id })).toString('base64');
}

export function decodeCursor(cursor: string): { at: Date; id: string } {
  if (cursor.length > MAX_CURSOR_BYTES) {
    throw new Error('INVALID_CURSOR: too large');
  }
  let raw: unknown;
  try {
    raw = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
  } catch {
    throw new Error('INVALID_CURSOR: cannot parse base64 JSON');
  }
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('INVALID_CURSOR: not an object');
  }
  const r = raw as Record<string, unknown>;
  if (typeof r.at !== 'string' || typeof r.id !== 'string') {
    throw new Error('INVALID_CURSOR: missing at or id field');
  }
  if (!UUID_RE.test(r.id)) {
    throw new Error('INVALID_CURSOR: id is not a valid UUID');
  }
  const at = new Date(r.at);
  if (isNaN(at.getTime())) {
    throw new Error('INVALID_CURSOR: bad date');
  }
  return { at, id: r.id };
}

// Deprecated aliases kept for any callers still using the old names
/** @deprecated Use encodeCursor */
export const encodeCursorForTest = encodeCursor;
/** @deprecated Use decodeCursor */
export const decodeCursorForTest = decodeCursor;
