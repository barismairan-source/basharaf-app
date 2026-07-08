import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { applicationCreateSchema } from '@/lib/validations/recruitment';
import { checkRateLimit, recordFailedAttempt, getClientIp } from '@/lib/auth/rateLimit';

/**
 * POST /api/recruitment — عمومی (متقاضی login ندارد). ثبت یک درخواست استخدام.
 * GET  /api/recruitment — فقط SuperAdmin. لیست برای پنل.
 */

export async function POST(req: Request) {
  try {
    // محدودیت اسپم — چون route عمومی است
    const ip = getClientIp(req);
    const rl = checkRateLimit(ip);
    if (!rl.allowed) {
      throw new ApiError(429, `تعداد درخواست‌ها زیاد است. ${rl.retryAfter ?? 60} ثانیه دیگر تلاش کنید.`, 'RATE_LIMITED');
    }

    const input = applicationCreateSchema.parse(await req.json());

    // پاسخ‌ها پویا هستند (سوال‌ها از پنل قابل ویرایش‌اند)؛ هر پاسخ متنی معتبر را نگه دار
    const answers: Record<string, string> = {};
    for (const [id, v] of Object.entries(input.answers)) {
      if (typeof v === 'string' && v.trim()) answers[id] = v.trim();
    }

    // هر ثبت را به‌عنوان یک تلاش بشمار (محدودیت تعداد ثبت per IP)
    recordFailedAttempt(ip);

    const [row] = await db
      .insert(schema.jobApplications)
      .values({
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        age: input.age,
        gender: input.gender,
        city: input.city,
        hasResume: input.hasResume,
        resumeUrl: input.resumeUrl ?? null,
        resumePath: input.resumePath ?? null,
        manualInfo: input.manualInfo ?? null,
        answers,
        area: input.area,
        shiftAvailability: input.shiftAvailability ?? null,
        startAvailability: input.startAvailability ?? null,
        referralSource: input.referralSource ?? null,
      })
      .returning({ id: schema.jobApplications.id });

    if (!row) throw new ApiError(500, 'خطا در ثبت درخواست', 'INSERT_FAILED');
    return NextResponse.json({ ok: true, id: row.id }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}

export async function GET() {
  try {
    await requireAdmin();
    const rows = await db
      .select()
      .from(schema.jobApplications)
      .orderBy(desc(schema.jobApplications.createdAt));

    return NextResponse.json({
      applications: rows.map((r) => ({
        id: r.id,
        firstName: r.firstName,
        lastName: r.lastName,
        phone: r.phone,
        age: r.age,
        gender: r.gender,
        city: r.city,
        hasResume: r.hasResume,
        resumeUrl: r.resumeUrl,
        resumePath: r.resumePath,
        manualInfo: r.manualInfo,
        answers: (r.answers ?? {}) as Record<string, string>,
        area: r.area,
        shiftAvailability: (r.shiftAvailability as string[] | null) ?? null,
        startAvailability: r.startAvailability ?? null,
        referralSource: r.referralSource ?? null,
        status: r.status,
        score: r.score,
        reviewerNote: r.reviewerNote,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch (e) {
    return handleError(e);
  }
}
