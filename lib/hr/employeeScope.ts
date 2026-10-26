import { inArray } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { ApiError } from '@/lib/api-error';
import type { JWTPayload } from '@/lib/auth/jwt';

/**
 * مدیر شعبه فقط برای پرسنل شعبه‌ی خودش حضور/شیفت ثبت کند. پیش از این فقط شعبه‌ی ردیف به شعبه‌ی
 * کاربر ثابت می‌شد، ولی employeeId هر کسی را می‌پذیرفت (حضور نفرِ شعبه‌ی دیگر زیر شعبه‌ی خودش ثبت می‌شد).
 * مدیر کل محدودیتی ندارد.
 */
export async function assertEmployeesInScope(session: Pick<JWTPayload, 'role' | 'branchId'>, employeeIds: string[]): Promise<void> {
  if (session.role === 'SuperAdmin' || employeeIds.length === 0) return;
  const rows = await db.select({ id: schema.employees.id, branchId: schema.employees.branchId })
    .from(schema.employees).where(inArray(schema.employees.id, [...new Set(employeeIds)]));
  if (rows.length !== new Set(employeeIds).size || rows.some((r) => !session.branchId || r.branchId !== session.branchId)) {
    throw new ApiError(403, 'این نفر عضو شعبه‌ی شما نیست', 'FORBIDDEN_EMPLOYEE');
  }
}
