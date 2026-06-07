import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { applicationReviewSchema } from '@/lib/validations/recruitment';

/**
 * PATCH /api/recruitment/[id] — فقط SuperAdmin. تغییر وضعیت/امتیاز/بخش/یادداشت.
 * DELETE /api/recruitment/[id] — فقط SuperAdmin.
 */

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
