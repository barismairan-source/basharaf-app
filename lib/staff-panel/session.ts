import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { ApiError } from '@/lib/api-error';
import { getDeviceFromCookie, type ClockDevice } from '@/lib/attendance-clock/service';

/**
 * پنل پرسنل: هویت = همان گوشی فعال‌شده‌ی ثبت حضور (کوکی httpOnly). اطلاعات حساس (حقوق،
 * کد ملی، شبا) علاوه بر آن «قفل Face ID» دارند: بعد از هر تأیید Face ID یک کوکی امضاشده‌ی
 * ۱۰ دقیقه‌ای ساخته می‌شود که به همین گوشی بسته است. employeeId هرگز از درخواست گرفته
 * نمی‌شود — فقط از کلید گوشی.
 */
export const UNLOCK_COOKIE = 'basharaf-me-unlock';
export const UNLOCK_TTL_SECONDS = 10 * 60;
const AUDIENCE = 'staff-panel-unlock';

function secret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error('JWT_SECRET is not set or too short');
  return new TextEncoder().encode(s);
}

export async function requireMe(): Promise<ClockDevice> {
  const device = await getDeviceFromCookie();
  if (!device) throw new ApiError(401, 'این گوشی برای پنل پرسنل فعال نشده است. لینک شخصی را از مدیر بگیرید.', 'NO_DEVICE');
  return device;
}

export async function setUnlockCookie(deviceId: string): Promise<void> {
  const token = await new SignJWT({ purpose: 'unlock' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(deviceId)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${UNLOCK_TTL_SECONDS}s`)
    .sign(secret());
  cookies().set(UNLOCK_COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: UNLOCK_TTL_SECONDS,
  });
}

export async function isUnlocked(deviceId: string): Promise<boolean> {
  const token = cookies().get(UNLOCK_COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret(), { audience: AUDIENCE, algorithms: ['HS256'] });
    return payload.sub === deviceId;
  } catch {
    return false;
  }
}

export async function requireUnlocked(device: ClockDevice): Promise<void> {
  if (!(await isUnlocked(device.deviceId))) {
    throw new ApiError(403, 'برای دیدن این بخش، با Face ID / اثر انگشت تأیید کنید.', 'LOCKED');
  }
}

export function clearUnlockCookie(): void {
  cookies().set(UNLOCK_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 0 });
}
