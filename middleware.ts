import { NextResponse, type NextRequest } from 'next/server';
import { verifyToken, type JWTPayload } from '@/lib/auth/jwt';
import { canAccessSection, sectionForPath } from '@/lib/auth/permissions';

/**
 * اعمال فوری تغییر دسترسی:
 * permissions در JWT baked می‌شود (فقط با ورود بعدی به‌روز می‌شد). چون middleware
 * در Edge runtime اجرا می‌شود و به driver postgres دسترسی مستقیم ندارد، یک نسخه‌ی
 * تازه از role/permissions را از /api/auth/permissions می‌گیریم — با کش بسیار کوتاه
 * (HTTP Cache-Control + Next fetch revalidate) تا هم تقریباً فوری باشد، هم فشار
 * زیادی روی DB نگذارد. اگر fetch fail شود (شبکه/تایم‌اوت)، با مقادیر JWT ادامه
 * می‌دهیم — یعنی کاربر هیچ‌وقت به‌خاطر این لایه‌ی اضافه قفل نمی‌شود.
 */
async function fetchFreshAccess(
  request: NextRequest,
  token: string,
  fallback: JWTPayload
): Promise<Pick<JWTPayload, 'role' | 'branchId' | 'permissions'>> {
  try {
    const url = new URL('/api/auth/permissions', request.url);
    const res = await fetch(url, {
      headers: { authorization: `Bearer ${token}` },
      // کش کوتاه سمت Next/Edge — چند ثانیه کافی است تا «فوری» حس شود
      next: { revalidate: 5 },
    });
    if (!res.ok) {
      // کاربر حذف/غیرفعال شده یا توکن نامعتبر شناخته شد → دسترسی را کاملاً ببند
      if (res.status === 404 || res.status === 401) {
        return { role: fallback.role, branchId: fallback.branchId, permissions: ['__revoked__'] };
      }
      return fallback;
    }
    const fresh = (await res.json()) as { role: JWTPayload['role']; branchId: string | null; permissions: string[] | null };
    return fresh;
  } catch {
    // شبکه/تایم‌اوت: روی داده‌ی JWT برگرد تا کاربر قفل نشود
    return fallback;
  }
}

/**
 * Middleware — Edge runtime auth guard با JWT verification.
 *
 * فاز ۱۰: cookie حاوی JWT است که با jose verify می‌شود.
 * verifyToken از jose استفاده می‌کند که Edge-compatible است.
 *
 * اگر JWT invalid یا expired باشد، حذف می‌شود و کاربر به login می‌رود.
 */

const SESSION_COOKIE = 'basharaf-session';

const PROTECTED_PREFIXES = ['/dashboard', '/transactions', '/settings', '/reports', '/accounts', '/contacts', '/menu', '/orders', '/logs', '/employees', '/payroll', '/inventory', '/recruitment', '/customers', '/reservations', '/coupons', '/purchase-orders', '/equipment', '/tasks'];
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
  // به‌جای اعتماد کامل به permissions بِیک‌شده در JWT (که فقط با ورود بعدی
  // به‌روز می‌شد)، یک نسخه‌ی تازه (با کش کوتاه) از DB می‌گیریم تا تغییر
  // دسترسی توسط مدیر تقریباً فوری اعمال شود — بدون نیاز به logout/login مجدد.
  if (isProtected && isAuthed && session && token) {
    const section = sectionForPath(pathname);
    if (section) {
      const access = await fetchFreshAccess(request, token, session);
      if (!canAccessSection(access, section)) {
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
