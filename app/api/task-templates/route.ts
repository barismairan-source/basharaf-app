import { NextResponse } from 'next/server';
import { or, eq, isNull, asc } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession, requireAdmin } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';
import { rowToTaskTemplate } from '@/lib/db/operations.serializers';
import { audit } from '@/lib/auth/audit';

/**
 * /api/task-templates
 *   GET  — لیست قالب‌های وظیفه (برای SuperAdmin همه؛ برای BranchUser/Warehouse
 *          فقط قالب‌های شعبه‌ی خودشان + قالب‌های سراسری branchId=null).
 *   POST — ساخت قالب جدید (فقط SuperAdmin).
 */

const createTaskTemplateSchema = z.object({
  branchId: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(160),
  category: z.string().min(1).max(60).optional().default('ops'),
  assignedRole: z.enum(['SuperAdmin', 'BranchUser', 'Warehouse']).optional().default('BranchUser'),
  frequency: z.enum(['daily', 'weekly', 'monthly']).optional().default('daily'),
  estimatedMinutes: z.number().int().min(0).max(1440).optional().default(0),
  checklistJson: z.array(z.string().min(1).max(200)).max(50).optional().nullable(),
});

export async function GET() {
  try {
    const session = await requireSession();

    const rows = session.role === 'SuperAdmin'
      ? await db.select().from(schema.taskTemplates).orderBy(asc(schema.taskTemplates.title))
      : await db.select().from(schema.taskTemplates)
          .where(or(isNull(schema.taskTemplates.branchId), eq(schema.taskTemplates.branchId, session.branchId!)))
          .orderBy(asc(schema.taskTemplates.title));

    return NextResponse.json({ templates: rows.map(rowToTaskTemplate) });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAdmin();
    const input = createTaskTemplateSchema.parse(await req.json());

    const [row] = await db.insert(schema.taskTemplates).values({
      branchId: input.branchId ?? null,
      title: input.title,
      category: input.category,
      assignedRole: input.assignedRole,
      frequency: input.frequency,
      estimatedMinutes: input.estimatedMinutes,
      checklistJson: input.checklistJson ?? null,
    }).returning();

    audit({ action: 'taskTemplate.created', userId: session.sub, meta: { templateId: row!.id, title: row!.title } });

    return NextResponse.json({ template: rowToTaskTemplate(row!) }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
