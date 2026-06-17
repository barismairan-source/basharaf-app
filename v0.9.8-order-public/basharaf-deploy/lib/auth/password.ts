import bcrypt from 'bcryptjs';

/**
 * Password hashing با bcryptjs.
 *
 * چرا bcryptjs به‌جای bcrypt؟
 * - bcryptjs pure JS است → سازگار با همه platforms (Edge، Vercel، Liara)
 * - bcrypt native binary می‌خواهد که در Edge runtime در دسترس نیست
 * - تفاوت سرعت در عمل ناچیز است (~۱۰۰ms به‌جای ~۸۰ms برای hash)
 *
 * Cost factor 10:
 * - 10 = استاندارد امن برای 2026
 * - 12 = بهتر ولی هر login ~۲۰۰ms کندتر
 * - 8 = خیلی سریع ولی کمتر امن
 */

const COST_FACTOR = 10;

export async function hashPassword(plaintext: string): Promise<string> {
  if (!plaintext || plaintext.length < 1) {
    throw new Error('Password cannot be empty');
  }
  return bcrypt.hash(plaintext, COST_FACTOR);
}

export async function verifyPassword(
  plaintext: string,
  hash: string
): Promise<boolean> {
  if (!plaintext || !hash) return false;
  try {
    return await bcrypt.compare(plaintext, hash);
  } catch {
    return false;
  }
}
