import { NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { createStaffReservation } from '@/lib/reservations/adminBooking';

const createSchema = z.object({
  customerId: z.string().uuid().nullable().optional(),
  branchId: z.string().uuid().nullable().optional(),
  tableId: z.string().uuid().nullable().optional(),
  date: z.string().min(6).max(12),
  time: z.string().min(3).max(8),
  partySize: z.number().int().positive().default(1),
  note: z.string().max(300).nullable().optional(),
  guestName: z.string().max(80).nullable().optional(),
  guestPhone: z.string().max(20).nullable().optional(),
  bookerName: z.string().max(80).nullable().optional(),
});

type ResRow = typeof schema.reservations.$inferSelect;

function serialize(r: ResRow) {
  return {
    id: r.id,
    customerId: r.customerId,
    branchId: r.branchId,
    tableId: r.tableId,
    date: r.date,
    time: r.time,
    partySize: r.partySize,
    status: r.status,
    note: r.note,
    guestName: r.guestName,
    guestPhone: r.guestPhone,
    bookerName: r.bookerName,
    trackingCode: r.trackingCode,
    canceledReason: r.canceledReason,
    source: r.source,
    createdBy: r.createdBy,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function GET() {
  try {
    const session = await requireSession();
    if (session.role === 'Warehouse' || session.role === 'Chef') {
      throw new ApiError(403, 'دسترسی به رزرو میز ندارید', 'FORBIDDEN');
    }
    if (session.role !== 'SuperAdmin' && !session.branchId) {
      return NextResponse.json({ reservations: [] });
    }
    const where =
      session.role === 'SuperAdmin'
        ? undefined
        : eq(schema.reservations.branchId, session.branchId as string);

    const rows = await db
      .select()
      .from(schema.reservations)
      .where(where)
      .orderBy(desc(schema.reservations.date), desc(schema.reservations.createdAt));
    return NextResponse.json({ reservations: rows.map(serialize) });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    if (session.role === 'Warehouse' || session.role === 'Chef') {
      throw new ApiError(403, 'دسترسی به رزرو میز ندارید', 'FORBIDDEN');
    }
    const input = createSchema.parse(await req.json());

    const branchId =
      session.role === 'SuperAdmin' ? (input.branchId ?? null) : session.branchId;
    if (!branchId) throw new ApiError(400, 'شعبه برای رزرو مشخص نیست', 'BRANCH_REQUIRED');

    if (!input.customerId && !input.guestName) {
      throw new ApiError(400, 'برای رزرو مهمان، نام مهمان لازم است', 'GUEST_NAME_REQUIRED');
    }

    const row = await createStaffReservation({
      branchId,
      customerId: input.customerId ?? null,
      tableId: input.tableId ?? null,
      date: input.date,
      time: input.time.trim(),
      partySize: input.partySize,
      note: input.note ?? null,
      guestName: input.guestName ?? null,
      guestPhone: input.guestPhone ?? null,
      bookerName: input.bookerName ?? null,
      createdBy: session.sub,
    });
    return NextResponse.json({ reservation: serialize(row as ResRow) }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
