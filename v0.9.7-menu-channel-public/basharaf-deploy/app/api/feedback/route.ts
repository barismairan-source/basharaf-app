import { NextResponse } from 'next/server';
import { and, eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

const createSchema = z.object({
  customerId: z.string().uuid().nullable().optional(),
  branchId: z.string().uuid().nullable().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).nullable().optional(),
  source: z.string().max(40).optional(),
  refTransactionId: z.string().uuid().nullable().optional(),
});

type FeedbackRow = typeof schema.feedback.$inferSelect;

function serialize(f: FeedbackRow) {
  return {
    id: f.id,
    customerId: f.customerId,
    branchId: f.branchId,
    rating: f.rating,
    comment: f.comment,
    source: f.source,
    refTransactionId: f.refTransactionId,
    createdAt: f.createdAt.toISOString(),
  };
}

export async function GET() {
  try {
    const session = await requireSession();
    if (session.role !== 'SuperAdmin' && !session.branchId) {
      return NextResponse.json({ feedback: [] });
    }
    const where =
      session.role === 'SuperAdmin'
        ? undefined
        : eq(schema.feedback.branchId, session.branchId as string);
    const rows = await db
      .select()
      .from(schema.feedback)
      .where(where)
      .orderBy(desc(schema.feedback.createdAt))
      .limit(200);
    return NextResponse.json({ feedback: rows.map(serialize) });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const input = createSchema.parse(await req.json());

    // resolve branch: admin explicit → session branch → customer home branch
    let branchId =
      session.role === 'SuperAdmin' ? (input.branchId ?? null) : session.branchId;
    if (!branchId && input.customerId) {
      const [c] = await db
        .select({ homeBranchId: schema.customers.homeBranchId })
        .from(schema.customers)
        .where(eq(schema.customers.id, input.customerId));
      branchId = c?.homeBranchId ?? null;
    }
    if (!branchId) throw new ApiError(400, 'شعبه برای ثبت بازخورد مشخص نیست', 'BRANCH_REQUIRED');

    const [f] = await db
      .insert(schema.feedback)
      .values({
        customerId: input.customerId ?? null,
        branchId,
        rating: input.rating,
        comment: input.comment ?? null,
        source: input.source ?? 'in_store',
        refTransactionId: input.refTransactionId ?? null,
      })
      .returning();
    if (!f) throw new ApiError(500, 'خطا در ثبت بازخورد', 'INSERT_FAILED');
    return NextResponse.json({ feedback: serialize(f) }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
