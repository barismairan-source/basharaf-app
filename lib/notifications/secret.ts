import { timingSafeEqual } from 'crypto';

/**
 * Constant-time string comparison — prevents timing-based secret enumeration.
 * When lengths differ, still runs a dummy comparison to avoid leaking length info.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, 'utf8');
    const bb = Buffer.from(b, 'utf8');
    if (ba.length !== bb.length) {
      timingSafeEqual(ba, ba);
      return false;
    }
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}
