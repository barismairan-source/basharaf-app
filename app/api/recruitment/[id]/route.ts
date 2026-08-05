import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { applicationReviewSchema } from '@/lib/validations/recruitment';

/**
 * PATCH /api/recruitment/[id] — فقط SuperAdmin. تغییر وضعیت/امتیاز/بخش/یادداشت.
 * DELETE /api/recruitment/[id] — فقط SuperAdmin.
 *
 * ⚠️ فاز ۷ یکپارچه‌سازی HR: تا قبل از این فاز، ست‌کردن status='accepted'
 * این‌جا به‌طور ضمنی یک پرونده‌ی پرسنلی هم می‌ساخت (idempotent با شماره
 * تلفن). آن رفتار عمداً حذف شد — چون: ۱) atomic نبود (race ممکن بود دو
 * کارمند برای یک تلفن بسازد چون تشخیص تکراری فقط SELECT قبل از INSERT
 * بود، نه قفل)، ۲) هیچ ارتباطی بین کارمند ساخته‌شده و متقاضی ذخیره
 * نمی‌کرد (نه sourceApplicationId، نه hiredAt/hiredBy — دقیقاً همان مشکلی
 * که فاز ۷ باید حل کند)، ۳) اگر همزمان با دکمه‌ی «تبدیل به پرسنل» جدید
 * (POST /api/hr/recruitment/[id]/hire) استفاده می‌شد، امکان ساخت دو
 * کارمند برای یک متقاضی وجود داشت. الان «قبول‌کردن» (status='accepted')
 * فقط یک تصمیم است؛ «استخدام واقعی» (ساخت پرونده‌ی پرسنلی + hiredAt) فقط
 * از مسیر اتمیک جدید ممکن است — دقیقاً همان تفکیک accepted/hired که در
 * دستور اصلی خواسته شده بود، بدون نیاز به افزودن مقدار enum جدید.
 */

/** GET /api/recruitment/[id] — یک متقاضی (برای تب «منبع استخدام» پرونده‌ی پرسنلی). */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const [row] = await db.select().from(schema.jobApplications).where(eq(schema.jobApplications.id, params.id)).limit(1);
    if (!row) throw new ApiError(404, 'درخواست پیدا نشد', 'NOT_FOUND');
    return NextResponse.json({
      application: {
        ...row,
        answers: (row.answers ?? {}) as Record<string, string>,
        hiredAt: row.hiredAt ? row.hiredAt.toISOString() : null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin();
    const patch = applicationReviewSchema.parse(await req.json());

    const [row] = await db
      .update(schema.jobApplications)
      .set({
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.score !== undefined ? { score: patch.score } : {}),
        ...(patch.area !== undefined ? { area: patch.area } : {}),
        ...(patch.reviewerNote !== undefined ? { reviewerNote: patch.reviewerNote } : {}),
        reviewedBy: session.sub,
        updatedAt: new Date(),
      })
      .where(eq(schema.jobApplications.id, params.id))
      .returning();
    if (!row) throw new ApiError(404, 'درخواست پیدا نشد', 'NOT_FOUND');

    return NextResponse.json({
      application: {
        ...row,
        answers: (row.answers ?? {}) as Record<string, string>,
        hiredAt: row.hiredAt ? row.hiredAt.toISOString() : null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    await db.delete(schema.jobApplications).where(eq(schema.jobApplications.id, params.id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
