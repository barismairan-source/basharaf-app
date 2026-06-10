import { NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

const patchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  phone: z.string().min(3).max(20).optional(),
  birthday: z.string().max(12).nullable().optional(),
  contactId: z.string().uuid().nullable().optional(),
  note: z.string().max(500).nullable().optional(),
  tier: z.enum(['bronze', 'silver', 'gold', 'platinum']).optional(),
  isActive: z.boolean().optional(),
  // points عمداً اینجا نیست — فقط با helper اتمیک امتیاز تغییر می‌کند (فاز ۲).
});

/** scope شعبه: BranchUser فقط مشتری شعبه‌ی خودش. */
function ensureScope(
  role: string,
  branchId: string | null,
  customerBranch: string | null,
): void {
  if (role === 'SuperAdmin') return;
  if (!branchId || customerBranch !== branchId) {
    throw new ApiError(404, 'مشتری پیدا نشد', 'NOT_FOUND');
  }
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const [c] = await db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.id, params.id));
    if (!c) throw new ApiError(404, 'مشتری پیدا نشد', 'NOT_FOUND');
    ensureScope(session.role, session.branchId, c.homeBranchId);

    const [loyalty, reservations, feedback] = await Promise.all([
      db
        .select()
        .from(schema.loyaltyEntries)
        .where(eq(schema.loyaltyEntries.customerId, c.id))
        .orderBy(desc(schema.loyaltyEntries.createdAt))
        .limit(50),
      db
        .select()
        .from(schema.reservations)
        .where(eq(schema.reservations.customerId, c.id))
        .orderBy(desc(schema.reservations.createdAt))
        .limit(50),
      db
        .select()
        .from(schema.feedback)
        .where(eq(schema.feedback.customerId, c.id))
        .orderBy(desc(schema.feedback.createdAt))
        .limit(50),
    ]);

    return NextResponse.json({
      customer: {
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
        loyalty: loyalty.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })),
        reservations: reservations.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
        })),
        feedback: feedback.map((f) => ({ ...f, createdAt: f.createdAt.toISOString() })),
      },
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const [existing] = await db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.id, params.id));
    if (!existing) throw new ApiError(404, 'مشتری پیدا نشد', 'NOT_FOUND');
    ensureScope(session.role, session.branchId, existing.homeBranchId);

    const input = patchSchema.parse(await req.json());
    const [updated] = await db
      .update(schema.customers)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(schema.customers.id, params.id))
      .returning();
    if (!updated) throw new ApiError(404, 'مشتری پیدا نشد', 'NOT_FOUND');

    return NextResponse.json({
      customer: {
        ...updated,
        points: Number(updated.points),
        totalSpent: Number(updated.totalSpent),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
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
      .from(schema.customers)
      .where(eq(schema.customers.id, params.id));
    if (!existing) throw new ApiError(404, 'مشتری پیدا نشد', 'NOT_FOUND');
    ensureScope(session.role, session.branchId, existing.homeBranchId);

    await db
      .update(schema.customers)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(schema.customers.id, params.id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
