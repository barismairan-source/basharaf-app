import { SignJWT, jwtVerify } from 'jose';

/**
 * JWT با jose — Edge runtime compatible.
 *
 * چرا jose به‌جای jsonwebtoken؟
 * - jose Edge-compatible است (در middleware.ts قابل استفاده)
 * - jsonwebtoken Node-only است (در middleware fail می‌شود)
 *
 * Token shape:
 *   { sub: userId, role: 'SuperAdmin' | 'BranchUser', branchId: string | null, iat, exp }
 *
 * Expiration: ۳۰ روز برای session معمولی، ۲۴ ساعت برای session حساس
 * (می‌توان در آینده با feature flag تنظیم کرد).
 */

const ALGORITHM = 'HS256';
const TOKEN_EXPIRY = '30d';

export interface JWTPayload {
  /** user.id (uuid) */
  sub: string;
  role: 'SuperAdmin' | 'BranchUser' | 'Warehouse' | 'Chef';
  branchId: string | null;
  /** لیست بخش‌های مجاز (granular). اگر null/خالی → پیش‌فرض نقش. */
  permissions?: string[] | null;
  /** issued at (epoch seconds) */
  iat?: number;
  /** expires at (epoch seconds) */
  exp?: number;
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET environment variable not set or too short.\n' +
        'یک رشته‌ی حداقل ۳۲ کاراکتری در .env.local تنظیم کنید.\n' +
        'برای تولید: openssl rand -base64 32'
    );
  }
  return new TextEncoder().encode(secret);
}

/**
 * Sign یک JWT با payload داده‌شده.
 */
export async function signToken(
  payload: Omit<JWTPayload, 'iat' | 'exp'>
): Promise<string> {
  const secret = getSecret();
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(secret);
}

/**
 * Verify یک JWT و payload استخراج می‌کند.
 * در صورت invalid signature، expired token یا malformed → null
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  if (!token) return null;
  try {
    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret, {
      algorithms: [ALGORITHM],
    });
    // type-narrow
    if (
      typeof payload.sub !== 'string' ||
      (payload.role !== 'SuperAdmin' && payload.role !== 'BranchUser' && payload.role !== 'Warehouse' && payload.role !== 'Chef')
    ) {
      return null;
    }
    return {
      sub: payload.sub,
      role: payload.role,
      branchId:
        typeof payload.branchId === 'string' ? payload.branchId : null,
      permissions: Array.isArray(payload.permissions)
        ? (payload.permissions as string[])
        : null,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}
