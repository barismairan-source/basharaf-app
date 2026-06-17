import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToTaskTemplate } from '@/lib/db/operations.serializers';
import { audit } from '@/lib/auth/audit';

/**
 * PATCH /api/task-templates/[id] — ویرایش قالب وظیفه (فقط SuperAdmin).
 * بیشتر برای فعال/غیرفعال کردن (isActive) و تنظیمات اولیه استفاده می‌شود.
 */

const patchTaskTemplateSchema = z.object({
  branchId: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(160).optional(),
  category: z.string().min(1).max(60).optional(),
  assignedRole: z.enum(['SuperAdmin', 'BranchUser', 'Warehouse']).optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  estimatedMinutes: z.number().int().min(0).max(1440).optional(),
  checklistJson: z.array(z.string().min(1).max(200)).max(50).optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdmin();
    const input = patchTaskTemplateSchema.parse(await req.json());

    const [row] = await db.update(schema.taskTemplates).set(input)
      .where(eq(schema.taskTemplates.id, params.id)).returning();
    if (!row) throw new ApiError(404, 'قالب وظیفه پیدا نشد', 'NOT_FOUND');

    audit({ action: 'taskTemplate.updated', userId: session.sub, meta: { templateId: row.id, changes: input } });

    return NextResponse.json({ template: rowToTaskTemplate(row) });
  } catch (e) {
    return handleError(e);
  }
}
