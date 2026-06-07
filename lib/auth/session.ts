import { cookies } from 'next/headers';
import { signToken, verifyToken, type JWTPayload } from './jwt';

/**
 * Server-side session management.
 *
 * این helpers فقط در Server Components، Route Handlers، و Server Actions
 * قابل استفاده‌اند (نه در Client Components یا middleware).
 *
 * Cookie name: `basharaf-session`
 * Cookie value: JWT
 * Cookie attributes: httpOnly, secure (production), sameSite=lax, path=/, maxAge=30d
 *
 * تفاوت با لایه‌ی client (`lib/session.ts`):
 * - این httpOnly می‌سازد (client نمی‌تواند بخواند → امن در برابر XSS)
 * - این JWT می‌سازد (verifiable در middleware و API)
 * - این از `next/headers` استفاده می‌کند که فقط server-side کار می‌کند
 *
 * Strategy: تغییر تدریجی
 * - فاز ۹: client cookie ساده (user.id)
 * - فاز ۱۰: server JWT (httpOnly)
 *
 * Migration: کاربرانی که با cookie قدیمی login بودند، خودکار به login page
 * هدایت می‌شوند چون verifyToken روی cookie قدیمی fail می‌شود.
 */

export const SESSION_COOKIE = 'basharaf-session';

const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

/**
 * ست کردن session cookie با JWT امضاشده.
 * فقط در Route Handlers/Server Actions قابل استفاده.
 */
export async function setServerSession(payload: {
  userId: string;
  role: 'SuperAdmin' | 'BranchUser' | 'Warehouse';
  branchId: string | null;
  permissions?: string[] | null;
}): Promise<void> {
  const token = await signToken({
    sub: payload.userId,
    role: payload.role,
    branchId: payload.branchId,
    permissions: payload.permissions ?? null,
  });

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: THIRTY_DAYS_SECONDS,
  });
}

/**
 * حذف session cookie. در logout استفاده می‌شود.
 */
export function clearServerSession(): void {
  cookies().set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

/**
 * خواندن و verify session فعلی.
 * در صورت عدم وجود یا invalid → null
 */
export async function getServerSession(): Promise<JWTPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Helper: گرفتن user.id فعلی از session، یا throw اگر unauthenticated.
 *
 * استفاده در API routes:
 *
 *   export async function GET() {
 *     const userId = await requireUserId();
 *     // ...
 *   }
 *
 * این error توسط catch block در route گرفته می‌شود و به 401 تبدیل می‌گردد.
 */
export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized');
    this.name = 'UnauthorizedError';
  }
}

export async function requireSession(): Promise<JWTPayload> {
  const session = await getServerSession();
  if (!session) {
    throw new UnauthorizedError();
  }
  return session;
}

export async function requireAdmin(): Promise<JWTPayload> {
  const session = await requireSession();
  if (session.role !== 'SuperAdmin') {
    throw new ForbiddenError();
  }
  return session;
}

/** اجازه بر اساس فهرستی از نقش‌های مجاز. */
export async function requireRole(
  ...roles: Array<'SuperAdmin' | 'BranchUser' | 'Warehouse'>
): Promise<JWTPayload> {
  const session = await requireSession();
  if (!roles.includes(session.role)) {
    throw new ForbiddenError();
  }
  return session;
}

export class ForbiddenError extends Error {
  constructor() {
    super('Forbidden');
    this.name = 'ForbiddenError';
  }
}
