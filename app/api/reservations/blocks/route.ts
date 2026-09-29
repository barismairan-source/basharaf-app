import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { createTableBlock } from '@/lib/reservations/adminBooking';

const createSchema = z.object({
  tableId: z.string().uuid(),
  date: z.string().min(6).max(12),
  startTime: z.string().min(3).max(8).nullable().optional(),
  endTime: z.string().min(3).max(8).nullable().optional(),
  reason: z.string().max(200).nullable().optional(),
});

type BlockRow = typeof schema.tableBlocks.$inferSelect;

function serialize(b: BlockRow) {
  return {
    id: b.id, tableId: b.tableId, branchId: b.branchId, date: b.date,
    startTime: b.startTime, endTime: b.endTime, reason: b.reason,
    createdAt: b.createdAt.toISOString(),
  };
}

/** GET /api/reservations/blocks?date= — مسدودی‌های شعبه (برای نمای روزانه). */
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    if (session.role !== 'SuperAdmin' && !session.branchId) return NextResponse.json({ blocks: [] });
    const url = new URL(req.url);
    const date = url.searchParams.get('date');

    const conditions = [];
    if (session.role !== 'SuperAdmin') conditions.push(eq(schema.tableBlocks.branchId, session.branchId as string));
    if (date) conditions.push(eq(schema.tableBlocks.date, date));

    const rows = await db.select().from(schema.tableBlocks)
      .where(conditions.length ? and(...conditions) : undefined);
    return NextResponse.json({ blocks: rows.map(serialize) });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    if (session.role === 'Warehouse' || session.role === 'Chef') {
      throw new ApiError(403, 'دسترسی ندارید', 'FORBIDDEN');
    }
    const input = createSchema.parse(await req.json());

    const [table] = await db.select({ branchId: schema.restaurantTables.branchId })
      .from(schema.restaurantTables).where(eq(schema.restaurantTables.id, input.tableId));
    if (!table) throw new ApiError(404, 'میز پیدا نشد', 'TABLE_NOT_FOUND');
    if (session.role !== 'SuperAdmin' && table.branchId !== session.branchId) {
      throw new ApiError(403, 'دسترسی ندارید', 'FORBIDDEN');
    }

    const row = await createTableBlock({
      tableId: input.tableId,
      branchId: table.branchId,
      date: input.date,
      startTime: input.startTime ?? null,
      endTime: input.endTime ?? null,
      reason: input.reason ?? null,
      createdBy: session.sub,
    });
    return NextResponse.json({ block: serialize(row as BlockRow) }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
