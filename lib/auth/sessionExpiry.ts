'use client';

/**
 * Global 401 handler.
 *
 * مشکل: وقتی session منقضی/نامعتبر می‌شود، API‌ها 401 برمی‌گردانند ولی
 * هر slice خطا را جداگانه catch می‌کند (و معمولاً یک آرایه‌ی خالی برمی‌گرداند)
 * → کاربر صفحه‌ی خالی با عددهای صفر می‌بیند، بدون این‌که بفهمد باید دوباره
 * وارد شود.
 *
 * راه‌حل: یک‌بار `window.fetch` را patch می‌کنیم. هر ۴۰۱ روی `/api/*`
 * (به‌جز تلاش لاگین خود و صفحات عمومی) → user را پاک می‌کند و به /login
 * هدایت می‌کند.
 */

// '/' = روت عمومی (صفحه‌ی همکاری). isPublicPath با p='/' فقط مسیر دقیق روت را
// match می‌کند (startsWith('//') هرگز true نیست) — پس مسیرهای دیگر تحت‌تأثیر نیستند.
// نکته: این allowlist باید با allowlist bootstrap در store/index.ts همگام بماند.
const PUBLIC_PATH_PREFIXES = ['/', '/login', '/signup', '/forgot', '/apply', '/m', '/order'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

let installed = false;
let redirecting = false;

export function installSessionExpiryInterceptor(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = (async (...args: Parameters<typeof fetch>) => {
    const response = await originalFetch(...args);

    if (response.status === 401) {
      const url = resolveUrl(args[0]);
      const isAppApi = url.startsWith('/api/') || url.startsWith(`${window.location.origin}/api/`);
      const isLoginAttempt = url.includes('/api/auth/login');

      if (isAppApi && !isLoginAttempt && !isPublicPath(window.location.pathname)) {
        void handleSessionExpired();
      }
    }

    return response;
  }) as typeof fetch;
}

async function handleSessionExpired(): Promise<void> {
  if (redirecting) return;
  redirecting = true;

  try {
    const { useAppStore } = await import('@/store');
    useAppStore.setState({ user: null, bootstrapped: true });
  } catch {
    /* اگر store در دسترس نبود، صرفاً ادامه بده */
  }

  // کوکی httpOnly را server-side پاک کن قبل از redirect.
  // بدون این مرحله middleware کوکی را می‌بیند و دوباره به /dashboard
  // برمی‌گرداند → حلقه‌ی بی‌نهایت ping-pong.
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  } catch {
    /* اگر logout request fail شد، ادامه بده — redirect مهم‌تر است */
  }

  window.location.replace('/login');
}
