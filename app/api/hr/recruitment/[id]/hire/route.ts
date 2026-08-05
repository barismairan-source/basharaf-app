import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleErrorLogged } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

const hireSchema = z.object({
  branchId: z.string().uuid().nullable().optional(),
  branchName: z.string().max(120).nullable().optional(),
  role: z.string().max(40).default('other'),
  joinDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/**
 * POST /api/hr/recruitment/[id]/hire — عملیات اتمیک استخدام.
 * قفل ردیف متقاضی، جلوگیری از استخدام تکراری، ساخت پرونده‌ی پرسنلی +
 * علامت‌گذاری متقاضی همه در یک تراکنش — یا هرچیز موفق می‌شود یا هیچ‌چیز
 * (بدون رکورد نیمه‌کاره).
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdmin();
    const input = hireSchema.parse(await req.json().catch(() => ({})));

    const employeeId = await db.transaction(async (tx) => {
      const [application] = await tx.select().from(schema.jobApplications)
        .where(eq(schema.jobApplications.id, params.id)).for('update');
      if (!application) throw new ApiError(404, 'متقاضی پیدا نشد', 'NOT_FOUND');
      if (application.hiredAt) throw new ApiError(409, 'این متقاضی قبلاً استخدام شده', 'ALREADY_HIRED');

      const [existingLink] = await tx.select({ id: schema.employees.id }).from(schema.employees)
        .where(eq(schema.employees.sourceApplicationId, params.id)).limit(1);
      if (existingLink) throw new ApiError(409, 'این متقاضی قبلاً به یک پرونده‌ی پرسنلی متصل شده', 'ALREADY_HIRED');

      const [employee] = await tx.insert(schema.employees).values({
        fullName: `${application.firstName} ${application.lastName}`.trim(),
        phone: application.phone,
        role: input.role,
        branchId: input.branchId ?? null,
        branchName: input.branchName ?? null,
        joinDate: new Date((input.joinDate ?? new Date().toISOString().slice(0, 10)) + 'T00:00:00Z'),
        compensationType: 'hourly', // تصمیم محصول: کارکنان جدید پیش‌فرض ساعتی
        sourceApplicationId: application.id,
      }).returning();
      if (!employee) throw new ApiError(500, 'خطا در ساخت پرونده‌ی پرسنلی', 'INSERT_FAILED');

      await tx.update(schema.jobApplications).set({
        status: 'accepted', hiredAt: new Date(), hiredBy: session.sub, updatedAt: new Date(),
      }).where(eq(schema.jobApplications.id, params.id));

      return employee.id;
    });

    return NextResponse.json({ ok: true, employeeId }, { status: 201 });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
