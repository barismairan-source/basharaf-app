import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { audit } from '@/lib/auth/audit';

function rowToCheque(
  row: typeof schema.cheques.$inferSelect,
  contactName: string | null
) {
  return {
    id: row.id,
    kind: row.kind as 'received' | 'issued',
    contactId: row.contactId ?? null,
    contactName,
    amount: Number(row.amount),
    serialNo: row.serialNo,
    bankName: row.bankName,
    dueDateJalali: row.dueDateJalali,
    status: row.status,
    note: row.note,
    branchId: row.branchId ?? null,
    createdBy: row.createdBy ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const patchSchema = z.object({
  kind:           z.enum(['received', 'issued']).optional(),
  contactId:      z.string().uuid().nullable().optional(),
  amount:         z.number().int().positive().optional(),
  serialNo:       z.string().max(100).optional(),
  bankName:       z.string().max(100).optional(),
  dueDateJalali:  z.string().min(1).max(30).optional(),
  status:         z.enum(['pending', 'cashed', 'bounced', 'returned', 'spent']).optional(),
  note:           z.string().max(500).optional(),
  branchId:       z.string().uuid().nullable().optional(),
});

async function loadCheque(id: string) {
  const [row] = await db
    .select({ cheque: schema.cheques, contactName: schema.contacts.name })
    .from(schema.cheques)
    .leftJoin(schema.contacts, eq(schema.cheques.contactId, schema.contacts.id))
    .where(eq(schema.cheques.id, id))
    .limit(1);
  return row ?? null;
}

/** GET /api/cheques/[id] */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireSession();
    const row = await loadCheque(params.id);
    if (!row) throw new ApiError(404, 'چک پیدا نشد', 'NOT_FOUND');
    return NextResponse.json({ cheque: rowToCheque(row.cheque, row.contactName ?? null) });
  } catch (e) {
    return handleError(e);
  }
}

/** PATCH /api/cheques/[id] */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const input = patchSchema.parse(await req.json());

    const existing = await loadCheque(params.id);
    if (!existing) throw new ApiError(404, 'چک پیدا نشد', 'NOT_FOUND');

    if (
      session.role === 'BranchUser' &&
      session.branchId &&
      existing.cheque.branchId !== session.branchId
    ) {
      throw new ApiError(403, 'دسترسی ندارید', 'FORBIDDEN');
    }

    const oldStatus = existing.cheque.status;
    const patch: Partial<typeof schema.cheques.$inferInsert> = {};
    if (input.kind          !== undefined) patch.kind          = input.kind;
    if (input.contactId     !== undefined) patch.contactId     = input.contactId;
    if (input.amount        !== undefined) patch.amount        = input.amount;
    if (input.serialNo      !== undefined) patch.serialNo      = input.serialNo;
    if (input.bankName      !== undefined) patch.bankName      = input.bankName;
    if (input.dueDateJalali !== undefined) patch.dueDateJalali = input.dueDateJalali;
    if (input.status        !== undefined) patch.status        = input.status;
    if (input.note          !== undefined) patch.note          = input.note;
    if (input.branchId      !== undefined) patch.branchId      = input.branchId;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ cheque: rowToCheque(existing.cheque, existing.contactName ?? null) });
    }

    await db.update(schema.cheques).set(patch).where(eq(schema.cheques.id, params.id));

    if (input.status && input.status !== oldStatus) {
      await audit({
        action: 'chq.statusChanged',
        userId: session.sub,
        meta: { chequeId: params.id, oldStatus, newStatus: input.status },
      });
    }

    const updated = await loadCheque(params.id);
    return NextResponse.json({ cheque: rowToCheque(updated!.cheque, updated?.contactName ?? null) });
  } catch (e) {
    return handleError(e);
  }
}

/** DELETE /api/cheques/[id] */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    if (session.role !== 'SuperAdmin') throw new ApiError(403, 'فقط SuperAdmin می‌تواند چک را حذف کند', 'FORBIDDEN');

    const existing = await loadCheque(params.id);
    if (!existing) throw new ApiError(404, 'چک پیدا نشد', 'NOT_FOUND');

    await db.delete(schema.cheques).where(eq(schema.cheques.id, params.id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
