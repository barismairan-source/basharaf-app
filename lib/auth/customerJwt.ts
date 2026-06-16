import { SignJWT, jwtVerify } from 'jose';

// JWT کاملاً مستقل از JWT پرسنل — از CUSTOMER_JWT_SECRET جداگانه استفاده می‌کند

const ALGORITHM = 'HS256';
const TOKEN_EXPIRY = '30d';

export interface CustomerJWTPayload {
  customerId: string;
  phone: string;
  role: 'customer';
  iat?: number;
  exp?: number;
}

function getSecret(): Uint8Array {
  const secret = process.env.CUSTOMER_JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'CUSTOMER_JWT_SECRET در .env.local تنظیم نشده یا کمتر از ۳۲ کاراکتر است.\n' +
        'برای تولید: openssl rand -base64 32'
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signCustomerToken(
  payload: Omit<CustomerJWTPayload, 'iat' | 'exp'>
): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(getSecret());
}

export async function verifyCustomerToken(token: string): Promise<CustomerJWTPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: [ALGORITHM] });
    if (
      typeof payload.customerId !== 'string' ||
      typeof payload.phone !== 'string' ||
      payload.role !== 'customer'
    ) {
      return null;
    }
    return {
      customerId: payload.customerId,
      phone: payload.phone,
      role: 'customer',
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}
