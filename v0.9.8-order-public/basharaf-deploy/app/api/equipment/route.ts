import { NextResponse } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToEquipment } from '@/lib/db/operations.serializers';
import { audit } from '@/lib/auth/audit';

/**
 * /api/equipment
 *   GET  — لیست تجهیزات (branch scope مثل اقلام انبار)
 *   POST — ثبت تجهیز جدید
 */

const createEquipmentSchema = z.object({
  branchId: z.string().uuid(),
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(120),
  category: z.string().max(60).optional().default('general'),
  purchaseDate: z.string().max(20).optional().nullable(),
  purchaseCost: z.number().min(0).max(999_999_999_999).optional().default(0),
  warrantyExpiry: z.string().max(20).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

export async function GET() {
  try {
    const session = await requireSession();
    const where = session.role === 'BranchUser' && session.branchId
      ? eq(schema.equipment.branchId, session.branchId)
      : undefined;

    const rows = await db.select().from(schema.equipment)
      .where(where).orderBy(desc(schema.equipment.createdAt));
    return NextResponse.json({ equipment: rows.map(rowToEquipment) });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const input = createEquipmentSchema.parse(await req.json());

    if (session.role === 'BranchUser' && input.branchId !== session.branchId) {
      throw new ApiError(403, 'شما فقط می‌توانید برای شعبه‌ی خود تجهیز ثبت کنید', 'BRANCH_MISMATCH');
    }

    // یکتایی کد در شعبه
    const [dup] = await db.select({ id: schema.equipment.id }).from(schema.equipment)
      .where(and(eq(schema.equipment.branchId, input.branchId), eq(schema.equipment.code, input.code)))
      .limit(1);
    if (dup) throw new ApiError(409, 'کد تجهیز در این شعبه تکراری است', 'DUPLICATE_CODE');

    const [row] = await db.insert(schema.equipment).values({
      branchId: input.branchId,
      code: input.code,
      name: input.name,
      category: input.category ?? 'general',
      purchaseDate: input.purchaseDate ?? null,
      purchaseCost: input.purchaseCost ?? 0,
      warrantyExpiry: input.warrantyExpiry ?? null,
      note: input.note ?? null,
    }).returning();

    if (!row) throw new ApiError(500, 'خطا در ثبت تجهیز', 'INSERT_FAILED');

    audit({ action: 'equipment.created', userId: session.sub, meta: { equipmentId: row.id, code: row.code, name: row.name } });

    return NextResponse.json({ equipment: rowToEquipment(row) }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
