import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { JWTPayload } from './jwt';

export const IMP_COOKIE = 'basharaf-imp';
const ALGORITHM = 'HS256';
const IMP_EXPIRY = '4h';

export interface ImpersonationPayload {
  /** id کاربر جعل‌هویت‌شده */
  sub: string;
  /** نام نمایشی کاربر جعل‌هویت‌شده (برای banner) */
  targetName: string;
  role: JWTPayload['role'];
  branchId: string | null;
  permissions?: string[] | null;
  /** id ادمین جعل‌هویت‌کننده */
  impersonatedBy: string;
  iat?: number;
  exp?: number;
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET missing or too short');
  return new TextEncoder().encode(secret);
}

export async function signImpersonationToken(
  payload: Omit<ImpersonationPayload, 'iat' | 'exp'>
): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(IMP_EXPIRY)
    .sign(getSecret());
}

export async function verifyImpersonationToken(
  token: string
): Promise<ImpersonationPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: [ALGORITHM] });
    if (typeof payload.sub !== 'string' || typeof payload.impersonatedBy !== 'string') return null;
    return {
      sub: payload.sub,
      targetName: typeof payload.targetName === 'string' ? payload.targetName : payload.sub,
      role: payload.role as JWTPayload['role'],
      branchId: typeof payload.branchId === 'string' ? payload.branchId : null,
      permissions: Array.isArray(payload.permissions) ? (payload.permissions as string[]) : null,
      impersonatedBy: payload.impersonatedBy as string,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

export async function getImpersonationSession(): Promise<ImpersonationPayload | null> {
  const token = cookies().get(IMP_COOKIE)?.value;
  if (!token) return null;
  return verifyImpersonationToken(token);
}

export async function setImpersonationSession(
  payload: Omit<ImpersonationPayload, 'iat' | 'exp'>
): Promise<void> {
  const token = await signImpersonationToken(payload);
  cookies().set(IMP_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 4 * 60 * 60,
  });
}

export function clearImpersonationSession(): void {
  cookies().set(IMP_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
