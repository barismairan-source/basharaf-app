import { NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToMaintenanceLog } from '@/lib/db/operations.serializers';
import { createExpenseTx, notifyPendingTransaction } from '@/lib/db/createExpenseTx';
import { audit } from '@/lib/auth/audit';

/**
 * /api/maintenance
 *   GET  — تاریخچه نگهداری یک تجهیز (equipmentId الزامی)
 *   POST — ثبت سابقه نگهداری/تعمیر — اگر cost > 0 باشد، یک تراکنش هزینه
 *          از طریق createExpenseTx (هسته مشترک فاز ۱) ساخته و به آن لینک می‌شود.
 */

const createMaintenanceSchema = z.object({
  equipmentId: z.string().uuid(),
  type: z.enum(['preventive', 'corrective', 'inspection']).optional().default('preventive'),
  date: z.string().min(1),
  cost: z.number().min(0).max(999_999_999_999).optional().default(0),
  vendor: z.string().max(120).optional().nullable(),
  note: z.string().max(500).optional().default(''),
  method: z.string().min(1).optional().default('نقد'),
  accountId: z.string().uuid().optional().nullable(),
});

async function getEquipmentWithBranchCheck(equipmentId: string, session: { role: string; branchId: string | null }) {
  const [equipment] = await db.select().from(schema.equipment)
    .where(eq(schema.equipment.id, equipmentId)).limit(1);
  if (!equipment) throw new ApiError(404, 'تجهیز پیدا نشد', 'NOT_FOUND');
  if (session.role === 'BranchUser' && session.branchId !== equipment.branchId) {
    throw new ApiError(403, 'شما فقط می‌توانید تجهیزات شعبه‌ی خود را مشاهده کنید', 'BRANCH_MISMATCH');
  }
  return equipment;
}

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const equipmentId = new URL(req.url).searchParams.get('equipmentId');
    if (!equipmentId) throw new ApiError(400, 'equipmentId الزامی است', 'EQUIPMENT_ID_REQUIRED');

    await getEquipmentWithBranchCheck(equipmentId, session);

    const rows = await db.select().from(schema.maintenanceLogs)
      .where(eq(schema.maintenanceLogs.equipmentId, equipmentId))
      .orderBy(desc(schema.maintenanceLogs.date), desc(schema.maintenanceLogs.createdAt));
    return NextResponse.json({ logs: rows.map(rowToMaintenanceLog) });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const input = createMaintenanceSchema.parse(await req.json());

    const equipment = await getEquipmentWithBranchCheck(input.equipmentId, session);
    const payee = (input.vendor && input.vendor.trim()) || 'تعمیر/نگهداری';

    let refTransactionId: string | null = null;
    let pendingTx: { id: string; title: string; branchName: string } | null = null;

    if (input.cost > 0) {
      const [branch] = await db.select().from(schema.branches)
        .where(eq(schema.branches.id, equipment.branchId)).limit(1);
      if (!branch) throw new ApiError(400, 'شعبه تجهیز پیدا نشد', 'BRANCH_NOT_FOUND');

      const tx = await db.transaction((dbTx) => createExpenseTx(dbTx, {
        type: 'expense',
        title: `تعمیر/نگهداری: ${equipment.name}`,
        categoryId: null,
        categoryName: 'تعمیر و نگهداری',
        amount: input.cost,
        payee,
        branchId: equipment.branchId,
        branchName: branch.name,
        method: input.method,
        date: input.date,
        note: input.note ?? '',
        accountId: input.accountId ?? null,
        createdBy: session.sub,
        role: session.role,
      }));

      refTransactionId = tx.id;
      if (tx.status === 'pending') pendingTx = { id: tx.id, title: tx.title, branchName: branch.name };
    }

    const [row] = await db.insert(schema.maintenanceLogs).values({
      equipmentId: input.equipmentId,
      type: input.type,
      date: input.date,
      cost: input.cost,
      vendor: input.vendor || null,
      note: input.note ?? '',
      refTransactionId,
      createdBy: session.sub,
    }).returning();

    if (!row) throw new ApiError(500, 'خطا در ثبت سابقه نگهداری', 'INSERT_FAILED');

    if (pendingTx) {
      await notifyPendingTransaction(pendingTx.id, pendingTx.title, pendingTx.branchName);
    }

    audit({ action: 'maintenance.created', userId: session.sub, meta: { maintenanceId: row.id, equipmentId: equipment.id, cost: input.cost } });

    return NextResponse.json({ log: rowToMaintenanceLog(row) }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
