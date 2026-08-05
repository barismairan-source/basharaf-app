import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession, requireAdmin } from '@/lib/auth/session';
import { ApiError, handleErrorLogged } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

/**
 * سمت‌های شغلی به‌عنوان جدول واقعی — زیرساخت آماده برای جایگزینی تدریجی
 * payroll.roles (تنظیمات JSON). فعلاً هیچ صفحه‌ای این را به‌جای تنظیمات
 * فعلی استفاده نمی‌کند — cutover نیازمند بررسی مقادیر واقعی و تأیید کاربر است.
 */
const saveSchema = z.object({
  name: z.string().min(1).max(80),
  code: z.string().max(40).nullable().optional(),
  department: z.string().max(80).nullable().optional(),
  branchId: z.string().uuid().nullable().optional(),
});

function rowToJobTitle(row: typeof schema.jobTitles.$inferSelect) {
  return {
    id: row.id, name: row.name, code: row.code, department: row.department,
    branchId: row.branchId, isActive: row.isActive,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET() {
  try {
    await requireSession();
    const rows = await db.select().from(schema.jobTitles).where(eq(schema.jobTitles.isActive, true));
    return NextResponse.json({ jobTitles: rows.map(rowToJobTitle) });
  } catch (e) {
    return await handleErrorLogged(e, undefined, { category: 'payroll' });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const input = saveSchema.parse(await req.json());
    const [row] = await db.insert(schema.jobTitles).values({
      name: input.name, code: input.code ?? null,
      department: input.department ?? null, branchId: input.branchId ?? null,
    }).returning();
    if (!row) throw new ApiError(500, 'خطا در ساخت سمت شغلی', 'INSERT_FAILED');
    return NextResponse.json({ jobTitle: rowToJobTitle(row) }, { status: 201 });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
