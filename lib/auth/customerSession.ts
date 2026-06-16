import { cookies } from 'next/headers';
import { signCustomerToken, verifyCustomerToken, type CustomerJWTPayload } from './customerJwt';

export const CUSTOMER_COOKIE = 'basharaf-customer';

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function setCustomerSession(customerId: string, phone: string): Promise<void> {
  const token = await signCustomerToken({ customerId, phone, role: 'customer' });
  cookies().set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: THIRTY_DAYS,
  });
}

export function clearCustomerSession(): void {
  cookies().set(CUSTOMER_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function getCustomerSession(): Promise<CustomerJWTPayload | null> {
  const token = cookies().get(CUSTOMER_COOKIE)?.value;
  if (!token) return null;
  return verifyCustomerToken(token);
}

export class CustomerUnauthorizedError extends Error {
  constructor() {
    super('Unauthorized');
    this.name = 'CustomerUnauthorizedError';
  }
}

export async function requireCustomer(): Promise<CustomerJWTPayload> {
  const session = await getCustomerSession();
  if (!session) throw new CustomerUnauthorizedError();
  return session;
}
