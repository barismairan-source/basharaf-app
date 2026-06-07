import { NextResponse, type NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { canAccessSection, sectionForPath } from '@/lib/auth/permissions';

/**
 * Middleware — Edge runtime auth guard با JWT verification.
 *
 * فاز ۱۰: cookie حاوی JWT است که با jose verify می‌شود.
 * verifyToken از jose استفاده می‌کند که Edge-compatible است.
 *
 * اگر JWT invalid یا expired باشد، حذف می‌شود و کاربر به login می‌رود.
 */

const SESSION_COOKIE = 'basharaf-session';

const PROTECTED_PREFIXES = ['/dashboard', '/transactions', '/settings', '/reports', '/accounts', '/contacts', '/menu', '/logs', '/employees', '/payroll', '/inventory', '/recruitment'];
const AUTH_ROUTES = ['/login', '/signup', '/forgot'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  // verify JWT (در صورت موجود بودن)
  const session = token ? await verifyToken(token) : null;
  const isAuthed = !!session;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthRoute = AUTH_ROUTES.some((p) => pathname === p);

  if (isProtected && !isAuthed) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    // اگر token موجود ولی invalid بود، آن را حذف کن
    const response = NextResponse.redirect(loginUrl);
    if (token && !session) {
      response.cookies.delete(SESSION_COOKIE);
    }
    return response;
  }

  if (isAuthRoute && isAuthed) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // گارد دسترسی بخش‌محور: اگر authed ولی به این بخش دسترسی ندارد → داشبورد
  if (isProtected && isAuthed && session) {
    const section = sectionForPath(pathname);
    if (section && !canAccessSection(session, section)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
