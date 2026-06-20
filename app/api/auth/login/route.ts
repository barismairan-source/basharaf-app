import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { verifyPassword } from '@/lib/auth/password';
import { setServerSession } from '@/lib/auth/session';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import {
  checkRateLimit,
  recordFailedAttempt,
  clearAttempts,
  getClientIp,
} from '@/lib/auth/rateLimit';
import { audit } from '@/lib/auth/audit';

/**
 * POST /api/auth/login — فاز ۱۵.
 *
 * اضافه شد:
 * - Rate limiting (۵ تلاش در ۱۵ دقیقه، بلاک ۳۰ دقیقه)
 * - Timing-safe comparison (برای جلوگیری از timing attacks)
 * - بهتر شدن error messages
 */

const loginBodySchema = z.object({
  email: z
    .string()
    .min(1, 'ایمیل الزامی است')
    .email('ایمیل معتبر وارد کنید')
    .transform((v) => v.trim().toLowerCase()),
  password: z.string().min(1, 'رمز عبور الزامی است'),
});

export async function POST(req: Request) {
  try {
    // ─── Rate Limiting ───
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(ip);

    if (!rateCheck.allowed) {
      const minutes = Math.ceil((rateCheck.retryAfter ?? 0) / 60);
      // audit: login blocked
      audit({ action: 'login.blocked', ip, meta: { retryAfter: rateCheck.retryAfter } });
      return NextResponse.json(
        {
          error: `تعداد تلاش‌های ناموفق بیش از حد مجاز است. ${minutes} دقیقه دیگر تلاش کنید.`,
          code: 'RATE_LIMITED',
          retryAfter: rateCheck.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.retryAfter ?? 1800),
            'X-RateLimit-Limit': '5',
          },
        }
      );
    }

    // ─── Validation ───
    const body = await req.json();
    const { email, password } = loginBodySchema.parse(body);

    // ─── Database lookup ───
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    // ─── Password verification ───
    // مهم: حتی اگر user نباشد، bcrypt را اجرا می‌کنیم
    // تا timing attack ممکن نشود (attacker نمی‌فهمد email وجود دارد یا نه)
    const DUMMY_HASH = '$2a$10$X7Q3Q3Q3Q3Q3Q3Q3Q3Q3OuX7Q3Q3Q3Q3Q3Q3Q3Q3Q3Q3Q3Q3Q3Q3';
    const hashToCheck = user?.passwordHash ?? DUMMY_HASH;
    const passwordValid = await verifyPassword(password, hashToCheck);

    if (!user || !passwordValid) {
      recordFailedAttempt(ip);
      audit({ action: 'login.failed', ip, meta: { email } });
      throw new ApiError(401, 'ایمیل یا رمز عبور نادرست است', 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      audit({ action: 'login.blocked_inactive', userId: user.id, ip });
      throw new ApiError(403, 'حساب کاربری شما غیرفعال شده است. با مدیر سیستم تماس بگیرید.', 'ACCOUNT_INACTIVE');
    }

    // ─── Success ───
    clearAttempts(ip);
    // audit: login success
    audit({ action: 'login.success', userId: user.id, ip });

    await setServerSession({
      userId: user.id,
      role: user.role,
      branchId: user.assignedBranchId,
      permissions: user.permissions ?? null,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        assignedBranch: user.assignedBranchId,
        initials: user.initials,
        lastSeen: user.lastSeen,
        joined: user.joined,
        permissions: user.permissions ?? null,
      },
    });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'auth' });
  }
}
