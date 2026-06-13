import { NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToTaskInstance } from '@/lib/db/operations.serializers';
import { getTodayJalali } from '@/lib/jalali';

/**
 * GET /api/tasks?branchId=X&date=YYYY/MM/DD&assignedUserId=Y&mine=1
 *   لیست وظایف یک شعبه برای یک روز — با فیلتر اختیاری مسئول یا «کارهای من».
 */
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);

    let branchId = searchParams.get('branchId');
    if (session.role !== 'SuperAdmin') {
      if (branchId && branchId !== session.branchId) {
        throw new ApiError(403, 'شما فقط می‌توانید وظایف شعبه‌ی خود را ببینید', 'BRANCH_MISMATCH');
      }
      branchId = session.branchId;
    }
    if (!branchId) throw new ApiError(400, 'شعبه الزامی است', 'BRANCH_REQUIRED');

    const date = searchParams.get('date') || getTodayJalali();
    const mine = searchParams.get('mine') === '1';
    const assignedUserId = searchParams.get('assignedUserId');

    const conditions = [
      eq(schema.taskInstances.branchId, branchId),
      eq(schema.taskInstances.dueDate, date),
    ];
    if (mine) conditions.push(eq(schema.taskInstances.assignedUserId, session.sub));
    else if (assignedUserId) conditions.push(eq(schema.taskInstances.assignedUserId, assignedUserId));

    const rows = await db.select({
      inst: schema.taskInstances,
      template: schema.taskTemplates,
      assignedUserName: schema.users.name,
    })
      .from(schema.taskInstances)
      .leftJoin(schema.taskTemplates, eq(schema.taskInstances.templateId, schema.taskTemplates.id))
      .leftJoin(schema.users, eq(schema.taskInstances.assignedUserId, schema.users.id))
      .where(and(...conditions))
      .orderBy(
        sql`CASE ${schema.taskInstances.status} WHEN 'pending' THEN 0 WHEN 'done' THEN 1 ELSE 2 END`,
        schema.taskTemplates.title,
      );

    const tasks = rows.map((r) => rowToTaskInstance(r.inst, r.template, r.assignedUserName));
    return NextResponse.json({ tasks });
  } catch (e) {
    return handleError(e);
  }
}
