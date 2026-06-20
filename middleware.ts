import { NextResponse, type NextRequest } from 'next/server';
import { verifyToken, type JWTPayload } from '@/lib/auth/jwt';
import { canAccessSection, sectionForPath } from '@/lib/auth/permissions';

const SESSION_COOKIE = 'basharaf-session';
const IMP_COOKIE = 'basharaf-imp';

const PROTECTED_PREFIXES = [
  '/dashboard', '/transactions', '/settings', '/reports', '/accounts',
  '/contacts', '/menu', '/orders', '/logs', '/employees', '/payroll',
  '/inventory', '/recruitment', '/customers', '/reservations', '/coupons',
  '/purchase-orders', '/equipment', '/tasks', '/admin',
];
const AUTH_ROUTES = ['/login', '/signup', '/forgot'];

/**
 * Forcefully clears both auth cookies in the response.
 * Must set explicit path + maxAge=0 so the browser removes them regardless
 * of what attributes were used when the cookies were originally Set.
 */
function clearAuthCookies(response: NextResponse): void {
  const base = {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    sameSite: 'lax' as const,
  };
  response.cookies.set({ name: SESSION_COOKIE, value: '', ...base });
  response.cookies.set({ name: IMP_COOKIE,     value: '', ...base });
}

/**
 * Build a safe login redirect URL.
 * Prevents stacking (?redirect=/login?redirect=...) by only adding the
 * redirect param when the destination is a real protected route.
 */
function loginRedirectUrl(request: NextRequest, from: string): URL {
  const url = new URL('/login', request.url);
  if (from && !AUTH_ROUTES.some((p) => from === p || from.startsWith(`${p}/`))) {
    url.searchParams.set('redirect', from);
  }
  return url;
}

/**
 * Fetch fresh role/permissions from DB (with a short Edge cache so we
 * don't hit the DB on every single request).
 *
 * Returns permissions: ['__revoked__'] when the user is deleted or inactive —
 * middleware must treat this as "session invalid → logout".
 */
async function fetchFreshAccess(
  request: NextRequest,
  token: string,
  fallback: JWTPayload,
): Promise<Pick<JWTPayload, 'role' | 'branchId' | 'permissions'>> {
  try {
    const url = new URL('/api/auth/permissions', request.url);
    const res = await fetch(url, {
      headers: { authorization: `Bearer ${token}` },
      next: { revalidate: 5 },
    });

    if (!res.ok) {
      // 401 = token invalid; 404 = user deleted; 403 = account inactive
      // All mean "session is no longer valid" — signal with __revoked__
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        return { role: fallback.role, branchId: fallback.branchId, permissions: ['__revoked__'] };
      }
      // Network / 5xx — fail open (don't lock user out due to infra issue)
      return fallback;
    }

    const fresh = (await res.json()) as {
      role: JWTPayload['role'];
      branchId: string | null;
      permissions: string[] | null;
    };
    return fresh;
  } catch {
    // Timeout or network error — fail open
    return fallback;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token   = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifyToken(token) : null;
  const isAuthed = !!session;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthRoute = AUTH_ROUTES.some((p) => pathname === p);

  // ── 1. Unauthenticated → login ────────────────────────────────────
  if (isProtected && !isAuthed) {
    const response = NextResponse.redirect(loginRedirectUrl(request, pathname));
    // If there was a token but it failed verification (expired/tampered),
    // aggressively clear it so the browser doesn't replay it.
    if (token) clearAuthCookies(response);
    return response;
  }

  // ── 2. /admin guard — real session only, must be SuperAdmin ───────
  if (pathname.startsWith('/admin') && isAuthed) {
    if (session!.role !== 'SuperAdmin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // ── 3. Auth routes while already logged in → dashboard ───────────
  if (isAuthRoute && isAuthed) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // ── 4. Section-level access check (live DB, short-cached) ─────────
  if (isProtected && isAuthed && session && token) {
    const section = sectionForPath(pathname);
    if (section) {
      const access = await fetchFreshAccess(request, token, session);

      // __revoked__ means the user was deleted or their account was deactivated.
      // We MUST clear cookies and send them to /login — NOT to /dashboard,
      // which would create an infinite redirect loop.
      if (access.permissions?.includes('__revoked__')) {
        const response = NextResponse.redirect(loginRedirectUrl(request, ''));
        clearAuthCookies(response);
        return response;
      }

      // No access to this section → redirect to dashboard (safe landing page).
      // Guard: if they're already on /dashboard and still have no access, log
      // them out to avoid a dashboard→dashboard loop.
      if (!canAccessSection(access, section)) {
        if (pathname.startsWith('/dashboard')) {
          const response = NextResponse.redirect(loginRedirectUrl(request, ''));
          clearAuthCookies(response);
          return response;
        }
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
