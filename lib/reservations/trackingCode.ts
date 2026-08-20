import { randomInt } from 'crypto';

/**
 * کد پیگیری ۶ رقمی برای رزرو عمومی (قابل خواندن تلفنی).
 * یکتایی توسط index جزئی reservations_tracking_code_uniq تضمین می‌شود؛
 * صدازننده باید روی خطای unique-violation یک بار دیگر تلاش کند.
 */
export function generateTrackingCode(): string {
  return String(randomInt(100000, 1000000));
}
