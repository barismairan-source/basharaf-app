import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToTaskInstance } from '@/lib/db/operations.serializers';
import { audit } from '@/lib/auth/audit';

/**
 * PATCH /api/tasks/[id]
 *   تکمیل/رد یا تخصیص یک وظیفه. کاربر عادی فقط می‌تواند به خودش تخصیص دهد
 *   یا تخصیص را بردارد (assignedUserId=null)؛ SuperAdmin به هرکس.
 */

const patchTaskSchema = z.object({
  status: z.enum(['pending', 'done', 'skipped']).optional(),
  note: z.string().max(500).optional().nullable(),
  assignedUserId: z.string().uuid().optional().nullable(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const input = patchTaskSchema.parse(await req.json());
    if (Object.keys(input).length === 0) {
      throw new ApiError(400, 'هیچ تغییری مشخص نشده است', 'NO_CHANGES');
    }

    const [existing] = await db.select().from(schema.taskInstances)
      .where(eq(schema.taskInstances.id, params.id)).limit(1);
    if (!existing) throw new ApiError(404, 'وظیفه پیدا نشد', 'NOT_FOUND');
    if (session.role !== 'SuperAdmin' && session.branchId !== existing.branchId) {
      throw new ApiError(403, 'شما فقط می‌توانید وظایف شعبه‌ی خود را ویرایش کنید', 'BRANCH_MISMATCH');
    }

    if (
      input.assignedUserId !== undefined &&
      input.assignedUserId !== null &&
      input.assignedUserId !== session.sub &&
      session.role !== 'SuperAdmin'
    ) {
      throw new ApiError(403, 'فقط می‌توانید وظیفه را به خودتان تخصیص دهید', 'ASSIGN_SELF_ONLY');
    }

    const updates: Partial<typeof schema.taskInstances.$inferInsert> = { ...input };
    if (input.status === 'done' || input.status === 'skipped') {
      updates.completedAt = new Date();
    } else if (input.status === 'pending') {
      updates.completedAt = null;
    }

    const [row] = await db.update(schema.taskInstances).set(updates)
      .where(eq(schema.taskInstances.id, params.id)).returning();
    if (!row) throw new ApiError(404, 'وظیفه پیدا نشد', 'NOT_FOUND');

    let template: { title: string; category: string; estimatedMinutes: number } | null = null;
    if (row.templateId) {
      const [tpl] = await db.select().from(schema.taskTemplates)
        .where(eq(schema.taskTemplates.id, row.templateId)).limit(1);
      if (tpl) template = { title: tpl.title, category: tpl.category, estimatedMinutes: tpl.estimatedMinutes };
    }
    let assignedUserName: string | null = null;
    if (row.assignedUserId) {
      const [u] = await db.select({ name: schema.users.name }).from(schema.users)
        .where(eq(schema.users.id, row.assignedUserId)).limit(1);
      assignedUserName = u?.name ?? null;
    }

    if (input.status === 'done') {
      audit({ action: 'task.completed', userId: session.sub, meta: { taskId: row.id } });
    } else if (input.status === 'skipped') {
      audit({ action: 'task.skipped', userId: session.sub, meta: { taskId: row.id, note: input.note } });
    } else if (input.assignedUserId !== undefined) {
      audit({ action: 'task.assigned', userId: session.sub, meta: { taskId: row.id, assignedUserId: input.assignedUserId } });
    }

    return NextResponse.json({ task: rowToTaskInstance(row, template, assignedUserName) });
  } catch (e) {
    return handleError(e);
  }
}
