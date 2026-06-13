import { NextResponse } from 'next/server';
import { and, eq, or, isNull, inArray, gte } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToTaskInstance } from '@/lib/db/operations.serializers';
import { getTodayJalali, jalaliToDate, dateToJalali } from '@/lib/jalali';
import { audit } from '@/lib/auth/audit';

/**
 * POST /api/tasks/generate-today
 *   از روی قالب‌های فعال، وظایف امروز یک شعبه را می‌سازد — idempotent:
 *   - daily   → اگر برای امروز قبلاً ساخته شده، دوباره نمی‌سازد.
 *   - weekly  → اگر در ۶ روز گذشته (یعنی فاصله کمتر از ۷ روز) نمونه‌ای هست، نمی‌سازد.
 *   - monthly → اگر در ۲۷ روز گذشته نمونه‌ای هست، نمی‌سازد.
 */

const generateSchema = z.object({
  branchId: z.string().uuid().optional(),
});

function daysAgoJalali(today: string, days: number): string {
  const d = jalaliToDate(today);
  if (!d) return today;
  d.setDate(d.getDate() - days);
  return dateToJalali(d);
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json().catch(() => ({}));
    const input = generateSchema.parse(body);

    let branchId = input.branchId ?? null;
    if (session.role !== 'SuperAdmin') {
      if (branchId && branchId !== session.branchId) {
        throw new ApiError(403, 'شما فقط می‌توانید برای شعبه‌ی خود وظیفه بسازید', 'BRANCH_MISMATCH');
      }
      branchId = session.branchId;
    }
    if (!branchId) throw new ApiError(400, 'شعبه الزامی است', 'BRANCH_REQUIRED');

    const today = getTodayJalali();
    const weekAgo = daysAgoJalali(today, 6);
    const monthAgo = daysAgoJalali(today, 27);

    const templates = await db.select().from(schema.taskTemplates)
      .where(and(
        eq(schema.taskTemplates.isActive, true),
        or(isNull(schema.taskTemplates.branchId), eq(schema.taskTemplates.branchId, branchId)),
      ));

    if (templates.length === 0) {
      return NextResponse.json({ created: 0, tasks: [] });
    }

    const templateIds = templates.map((t) => t.id);
    const recent = await db.select({
      templateId: schema.taskInstances.templateId,
      dueDate: schema.taskInstances.dueDate,
    })
      .from(schema.taskInstances)
      .where(and(
        eq(schema.taskInstances.branchId, branchId),
        inArray(schema.taskInstances.templateId, templateIds),
        gte(schema.taskInstances.dueDate, monthAgo),
      ));

    const lastDueByTemplate = new Map<string, string>();
    for (const r of recent) {
      if (!r.templateId) continue;
      const prev = lastDueByTemplate.get(r.templateId);
      if (!prev || r.dueDate > prev) lastDueByTemplate.set(r.templateId, r.dueDate);
    }

    const toCreate = templates.filter((t) => {
      const lastDue = lastDueByTemplate.get(t.id);
      if (!lastDue) return true;
      if (t.frequency === 'weekly') return lastDue < weekAgo;
      if (t.frequency === 'monthly') return lastDue < monthAgo;
      return lastDue < today; // daily
    });

    if (toCreate.length === 0) {
      return NextResponse.json({ created: 0, tasks: [] });
    }

    const inserted = await db.insert(schema.taskInstances).values(
      toCreate.map((t) => ({
        templateId: t.id,
        branchId: branchId!,
        dueDate: today,
        status: 'pending' as const,
      }))
    ).returning();

    audit({ action: 'task.generated', userId: session.sub, meta: { branchId, count: inserted.length, date: today } });

    const templateById = new Map(templates.map((t) => [t.id, t]));
    const tasks = inserted.map((row) => {
      const tpl = row.templateId ? templateById.get(row.templateId) : undefined;
      return rowToTaskInstance(row, tpl ? { title: tpl.title, category: tpl.category, estimatedMinutes: tpl.estimatedMinutes } : null, null);
    });

    return NextResponse.json({ created: inserted.length, tasks });
  } catch (e) {
    return handleError(e);
  }
}
