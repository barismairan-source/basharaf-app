import { SESSION_COOKIE } from '@/lib/auth/session';

export interface AuthedClient {
  baseUrl: string;
  cookie: string;
  fetchJson: <T>(path: string, init?: RequestInit) => Promise<{ status: number; body: T }>;
}

type HeadersWithSetCookie = Headers & { getSetCookie?: () => string[] };

/**
 * لاگین واقعی از طریق POST /api/auth/login و گرفتن کوکی session (httpOnly JWT)
 * — همان مسیری که مرورگر کاربر طی می‌کند. برای درخواست‌های بعدی، این کوکی
 * به‌صورت دستی در هدر Cookie ست می‌شود (چون اینجا cookie jar مرورگری نداریم).
 */
export async function login(baseUrl: string, email: string, password: string): Promise<AuthedClient> {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (res.status !== 200) {
    throw new Error(`لاگین تست ناموفق بود (status=${res.status}): ${await res.text()}`);
  }

  const headers = res.headers as HeadersWithSetCookie;
  const setCookies = headers.getSetCookie?.() ?? (() => {
    const raw = headers.get('set-cookie');
    return raw ? [raw] : [];
  })();

  const sessionEntry = setCookies.find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (!sessionEntry) throw new Error('کوکی session در پاسخ login یافت نشد');
  const cookie = sessionEntry.split(';')[0]!;

  return {
    baseUrl,
    cookie,
    async fetchJson<T>(path: string, init: RequestInit = {}) {
      const res = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookie,
          ...(init.headers ?? {}),
        },
      });
      const body = (await res.json()) as T;
      return { status: res.status, body };
    },
  };
}
