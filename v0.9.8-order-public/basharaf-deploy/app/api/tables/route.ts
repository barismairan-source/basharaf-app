import { NextResponse } from 'next/server';
import { and, eq, asc } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

const createSchema = z.object({
  name: z.string().min(1).max(60).transform((v) => v.trim()),
  capacity: z.number().int().nonnegative().default(0),
  area: z.string().max(60).nullable().optional(),
  branchId: z.string().uuid().nullable().optional(),
});

type TableRow = typeof schema.restaurantTables.$inferSelect;

function serialize(t: TableRow) {
  return {
    id: t.id,
    branchId: t.branchId,
    name: t.name,
    capacity: t.capacity,
    area: t.area,
    isActive: t.isActive,
    createdAt: t.createdAt.toISOString(),
  };
}

export async function GET() {
  try {
    const session = await requireSession();
    if (session.role !== 'SuperAdmin' && !session.branchId) {
      return NextResponse.json({ tables: [] });
    }
    const where =
      session.role === 'SuperAdmin'
        ? eq(schema.restaurantTables.isActive, true)
        : and(
            eq(schema.restaurantTables.isActive, true),
            eq(schema.restaurantTables.branchId, session.branchId as string),
          );
    const rows = await db
      .select()
      .from(schema.restaurantTables)
      .where(where)
      .orderBy(asc(schema.restaurantTables.name));
    return NextResponse.json({ tables: rows.map(serialize) });
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
    if (!branchId) throw new ApiError(400, 'شعبه برای میز مشخص نیست', 'BRANCH_REQUIRED');

    const [t] = await db
      .insert(schema.restaurantTables)
      .values({
        branchId,
        name: input.name,
        capacity: input.capacity,
        area: input.area ?? null,
      })
      .returning();
    if (!t) throw new ApiError(500, 'خطا در ساخت میز', 'INSERT_FAILED');
    return NextResponse.json({ table: serialize(t) }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
