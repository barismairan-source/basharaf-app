import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { applicationReviewSchema } from '@/lib/validations/recruitment';

/**
 * نگاشت بخش درخواست استخدام به نقش پرسنلی پیش‌فرض —
 * در صفحه‌ی پرسنل قابل ویرایش است.
 */
function defaultRoleForArea(area: string | null): string {
  if (area === 'kitchen') return 'cook';
  if (area === 'hall') return 'waiter';
  return 'other';
}

/**
 * PATCH /api/recruitment/[id] — فقط SuperAdmin. تغییر وضعیت/امتیاز/بخش/یادداشت.
 * با «قبول» (status='accepted') برای اولین بار، یک پرونده‌ی پرسنلی در
 * employees ساخته می‌شود (idempotent — با شماره تلفن چک می‌شود).
 * DELETE /api/recruitment/[id] — فقط SuperAdmin.
 */

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin();
    const patch = applicationReviewSchema.parse(await req.json());

    const row = await db.transaction(async (dbTx) => {
      const [current] = await dbTx.select().from(schema.jobApplications)
        .where(eq(schema.jobApplications.id, params.id)).limit(1);
      if (!current) throw new ApiError(404, 'درخواست پیدا نشد', 'NOT_FOUND');

      const [updated] = await dbTx
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
      if (!updated) throw new ApiError(404, 'درخواست پیدا نشد', 'NOT_FOUND');

      // قبول برای اولین بار → ساخت پرونده‌ی پرسنلی
      if (patch.status === 'accepted' && current.status !== 'accepted') {
        const [existing] = await dbTx.select({ id: schema.employees.id })
          .from(schema.employees)
          .where(eq(schema.employees.phone, current.phone))
          .limit(1);

        if (!existing) {
          await dbTx.insert(schema.employees).values({
            fullName: `${current.firstName} ${current.lastName}`.trim(),
            phone: current.phone,
            role: defaultRoleForArea(updated.area ?? current.area),
            gender: current.gender ?? null,
            joinDate: new Date(),
          });
        }
      }

      return updated;
    });

    return NextResponse.json({
      application: {
        ...row,
        answers: (row.answers ?? {}) as Record<string, string>,
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
