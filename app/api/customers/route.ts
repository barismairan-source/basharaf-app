import { NextResponse } from 'next/server';
import { and, eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

const createSchema = z.object({
  name: z.string().min(2).max(120).transform((v) => v.trim()),
  phone: z.string().min(3).max(20).transform((v) => v.trim()),
  birthday: z.string().max(12).nullable().optional(),
  homeBranchId: z.string().uuid().nullable().optional(),
  contactId: z.string().uuid().nullable().optional(),
  note: z.string().max(500).nullable().optional(),
});

type CustomerRow = typeof schema.customers.$inferSelect;

function serialize(c: CustomerRow) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    birthday: c.birthday,
    homeBranchId: c.homeBranchId,
    contactId: c.contactId,
    tier: c.tier,
    points: Number(c.points),
    visitCount: c.visitCount,
    totalSpent: Number(c.totalSpent),
    note: c.note,
    isActive: c.isActive,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export async function GET() {
  try {
    const session = await requireSession();

    // scope شعبه: SuperAdmin همه، در غیر این صورت فقط مشتریان شعبه‌ی خودش
    if (session.role !== 'SuperAdmin' && !session.branchId) {
      return NextResponse.json({ customers: [] });
    }
    const where =
      session.role === 'SuperAdmin'
        ? eq(schema.customers.isActive, true)
        : and(
            eq(schema.customers.isActive, true),
            eq(schema.customers.homeBranchId, session.branchId as string),
          );

    const rows = await db
      .select()
      .from(schema.customers)
      .where(where)
      .orderBy(desc(schema.customers.createdAt));

    return NextResponse.json({ customers: rows.map(serialize) });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const input = createSchema.parse(await req.json());

    // BranchUser فقط می‌تواند برای شعبه‌ی خودش مشتری بسازد
    const homeBranchId =
      session.role === 'SuperAdmin' ? (input.homeBranchId ?? null) : session.branchId;

    const [c] = await db
      .insert(schema.customers)
      .values({
        name: input.name,
        phone: input.phone,
        birthday: input.birthday ?? null,
        homeBranchId,
        contactId: input.contactId ?? null,
        note: input.note ?? null,
      })
      .returning();

    if (!c) throw new ApiError(500, 'خطا در ساخت مشتری', 'INSERT_FAILED');
    return NextResponse.json({ customer: serialize(c) }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
