import { NextResponse } from 'next/server';
import { eq, and, ne } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToEquipment } from '@/lib/db/operations.serializers';
import { audit } from '@/lib/auth/audit';

const patchEquipmentSchema = z.object({
  code: z.string().min(1).max(40).optional(),
  name: z.string().min(1).max(120).optional(),
  category: z.string().max(60).optional(),
  status: z.enum(['active', 'maintenance', 'retired']).optional(),
  purchaseDate: z.string().max(20).optional().nullable(),
  purchaseCost: z.number().min(0).max(999_999_999_999).optional(),
  warrantyExpiry: z.string().max(20).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const input = patchEquipmentSchema.parse(await req.json());

    const [existing] = await db.select().from(schema.equipment)
      .where(eq(schema.equipment.id, params.id)).limit(1);
    if (!existing) throw new ApiError(404, 'تجهیز پیدا نشد', 'NOT_FOUND');
    if (session.role === 'BranchUser' && session.branchId !== existing.branchId) {
      throw new ApiError(403, 'شما فقط می‌توانید تجهیزات شعبه‌ی خود را ویرایش کنید', 'BRANCH_MISMATCH');
    }

    if (input.code && input.code !== existing.code) {
      const [dup] = await db.select({ id: schema.equipment.id }).from(schema.equipment)
        .where(and(
          eq(schema.equipment.branchId, existing.branchId),
          eq(schema.equipment.code, input.code),
          ne(schema.equipment.id, params.id),
        )).limit(1);
      if (dup) throw new ApiError(409, 'کد تجهیز در این شعبه تکراری است', 'DUPLICATE_CODE');
    }

    const [row] = await db.update(schema.equipment).set(input)
      .where(eq(schema.equipment.id, params.id)).returning();
    if (!row) throw new ApiError(404, 'تجهیز پیدا نشد', 'NOT_FOUND');

    audit({ action: 'equipment.updated', userId: session.sub, meta: { equipmentId: row.id, changes: input } });

    return NextResponse.json({ equipment: rowToEquipment(row) });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();

    const [existing] = await db.select().from(schema.equipment)
      .where(eq(schema.equipment.id, params.id)).limit(1);
    if (!existing) throw new ApiError(404, 'تجهیز پیدا نشد', 'NOT_FOUND');
    if (session.role === 'BranchUser' && session.branchId !== existing.branchId) {
      throw new ApiError(403, 'شما فقط می‌توانید تجهیزات شعبه‌ی خود را حذف کنید', 'BRANCH_MISMATCH');
    }

    // soft-delete: بازنشسته‌کردن تجهیز (نه حذف فیزیکی) — تاریخچه نگهداری حفظ می‌شود
    const [row] = await db.update(schema.equipment)
      .set({ status: 'retired' })
      .where(eq(schema.equipment.id, params.id)).returning();
    if (!row) throw new ApiError(404, 'تجهیز پیدا نشد', 'NOT_FOUND');

    audit({ action: 'equipment.deleted', userId: session.sub, meta: { equipmentId: row.id, code: row.code } });

    return NextResponse.json({ equipment: rowToEquipment(row) });
  } catch (e) {
    return handleError(e);
  }
}
