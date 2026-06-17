import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

/** state machine وضعیت رزرو — گذارهای مجاز از هر وضعیت. */
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'seated', 'cancelled', 'no_show'],
  confirmed: ['seated', 'cancelled', 'no_show'],
  seated: [],
  cancelled: [],
  no_show: [],
};

const patchSchema = z.object({
  tableId: z.string().uuid().nullable().optional(),
  date: z.string().min(6).max(12).optional(),
  time: z.string().min(3).max(8).optional(),
  partySize: z.number().int().positive().optional(),
  note: z.string().max(300).nullable().optional(),
  status: z.enum(['pending', 'confirmed', 'seated', 'cancelled', 'no_show']).optional(),
});

function ensureScope(role: string, branchId: string | null, resBranch: string): void {
  if (role === 'SuperAdmin') return;
  if (!branchId || resBranch !== branchId) {
    throw new ApiError(404, 'رزرو پیدا نشد', 'NOT_FOUND');
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const [existing] = await db
      .select()
      .from(schema.reservations)
      .where(eq(schema.reservations.id, params.id));
    if (!existing) throw new ApiError(404, 'رزرو پیدا نشد', 'NOT_FOUND');
    ensureScope(session.role, session.branchId, existing.branchId);

    const input = patchSchema.parse(await req.json());

    // اعتبارسنجی گذار وضعیت
    if (input.status && input.status !== existing.status) {
      const allowed = ALLOWED_TRANSITIONS[existing.status] ?? [];
      if (!allowed.includes(input.status)) {
        throw new ApiError(
          409,
          `گذار از «${existing.status}» به «${input.status}» مجاز نیست`,
          'INVALID_TRANSITION',
        );
      }
    }

    // اگر میز عوض شد، باید هم‌شعبه باشد
    if (input.tableId) {
      const [t] = await db
        .select({ branchId: schema.restaurantTables.branchId })
        .from(schema.restaurantTables)
        .where(eq(schema.restaurantTables.id, input.tableId));
      if (!t || t.branchId !== existing.branchId) {
        throw new ApiError(400, 'میز انتخابی متعلق به این شعبه نیست', 'TABLE_BRANCH_MISMATCH');
      }
    }

    const [updated] = await db
      .update(schema.reservations)
      .set({ ...input })
      .where(eq(schema.reservations.id, params.id))
      .returning();
    if (!updated) throw new ApiError(404, 'رزرو پیدا نشد', 'NOT_FOUND');
    return NextResponse.json({
      reservation: { ...updated, createdAt: updated.createdAt.toISOString() },
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const [existing] = await db
      .select()
      .from(schema.reservations)
      .where(eq(schema.reservations.id, params.id));
    if (!existing) throw new ApiError(404, 'رزرو پیدا نشد', 'NOT_FOUND');
    ensureScope(session.role, session.branchId, existing.branchId);

    await db.delete(schema.reservations).where(eq(schema.reservations.id, params.id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
