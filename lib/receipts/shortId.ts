import { randomBytes } from 'crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'; // بدون حروف/عدد شبیه‌به‌هم (0/O، 1/l/I)

/** شناسه‌ی کوتاه تصادفی برای basharaf.me/r/{id} — طول ۸، ~۲۱۸ تریلیون حالت. */
export function generateShortId(length = 8): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i]! % ALPHABET.length];
  return out;
}
