import { NextResponse } from 'next/server';
import { and, eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

const createSchema = z.object({
  customerId: z.string().uuid().nullable().optional(),
  branchId: z.string().uuid().nullable().optional(),
  tableId: z.string().uuid().nullable().optional(),
  date: z.string().min(6).max(12),
  time: z.string().min(3).max(8),
  partySize: z.number().int().positive().default(1),
  note: z.string().max(300).nullable().optional(),
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
    createdBy: r.createdBy,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function GET() {
  try {
    const session = await requireSession();
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
    const input = createSchema.parse(await req.json());

    const branchId =
      session.role === 'SuperAdmin' ? (input.branchId ?? null) : session.branchId;
    if (!branchId) throw new ApiError(400, 'شعبه برای رزرو مشخص نیست', 'BRANCH_REQUIRED');

    // اگر میز انتخاب شده، باید متعلق به همان شعبه باشد
    if (input.tableId) {
      const [t] = await db
        .select({ branchId: schema.restaurantTables.branchId })
        .from(schema.restaurantTables)
        .where(eq(schema.restaurantTables.id, input.tableId));
      if (!t || t.branchId !== branchId) {
        throw new ApiError(400, 'میز انتخابی متعلق به این شعبه نیست', 'TABLE_BRANCH_MISMATCH');
      }
    }

    const [r] = await db
      .insert(schema.reservations)
      .values({
        customerId: input.customerId ?? null,
        branchId,
        tableId: input.tableId ?? null,
        date: input.date,
        time: input.time,
        partySize: input.partySize,
        note: input.note ?? null,
        createdBy: session.sub,
      })
      .returning();
    if (!r) throw new ApiError(500, 'خطا در ثبت رزرو', 'INSERT_FAILED');
    return NextResponse.json({ reservation: serialize(r) }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
