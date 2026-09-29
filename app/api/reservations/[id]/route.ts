import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { updateStaffReservation } from '@/lib/reservations/adminBooking';

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
  canceledReason: z.string().max(300).nullable().optional(),
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
    if (session.role === 'Warehouse' || session.role === 'Chef') {
      throw new ApiError(403, 'دسترسی به رزرو میز ندارید', 'FORBIDDEN');
    }
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

    const { status, canceledReason, ...capacityPatch } = input;
    const touchesCapacity = capacityPatch.tableId !== undefined || capacityPatch.date !== undefined
      || capacityPatch.time !== undefined || capacityPatch.partySize !== undefined;

    let updated: typeof existing | undefined;
    if (touchesCapacity) {
      updated = await updateStaffReservation(params.id, existing.branchId, {
        tableId: existing.tableId, date: existing.date, time: existing.time, partySize: existing.partySize,
      }, capacityPatch);
      if (status || canceledReason !== undefined) {
        [updated] = await db.update(schema.reservations)
          .set({ ...(status ? { status } : {}), ...(canceledReason !== undefined ? { canceledReason } : {}) })
          .where(eq(schema.reservations.id, params.id))
          .returning();
      }
    } else {
      [updated] = await db.update(schema.reservations)
        .set({ ...(status ? { status } : {}), ...(canceledReason !== undefined ? { canceledReason } : {}) })
        .where(eq(schema.reservations.id, params.id))
        .returning();
    }

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
    if (session.role === 'Warehouse' || session.role === 'Chef') {
      throw new ApiError(403, 'دسترسی به رزرو میز ندارید', 'FORBIDDEN');
    }
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
