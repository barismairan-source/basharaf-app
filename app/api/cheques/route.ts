import { NextResponse } from 'next/server';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';
import { notifyAdmins } from '@/lib/notify';
import { jalaliToDate } from '@/lib/jalali';

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
    status: row.status as import('@/types').ChequeStatus,
    note: row.note,
    branchId: row.branchId ?? null,
    createdBy: row.createdBy ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const createSchema = z.object({
  kind: z.enum(['received', 'issued']),
  contactId: z.string().uuid().optional().nullable(),
  amount: z.number().int().positive(),
  serialNo: z.string().max(100).optional().default(''),
  bankName: z.string().max(100).optional().default(''),
  dueDateJalali: z.string().min(1).max(30),
  note: z.string().max(500).optional().default(''),
  branchId: z.string().uuid().optional().nullable(),
});

/**
 * GET /api/cheques
 * filters: kind, status, dateFrom, dateTo (jalali strings)
 */
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const kind   = searchParams.get('kind');
    const status = searchParams.get('status');
    const from   = searchParams.get('dateFrom');
    const to     = searchParams.get('dateTo');

    const clauses = [];
    if (session.role === 'BranchUser' && session.branchId)
      clauses.push(eq(schema.cheques.branchId, session.branchId));
    if (kind)   clauses.push(eq(schema.cheques.kind, kind));
    if (status) clauses.push(eq(schema.cheques.status, status));
    if (from)   clauses.push(gte(schema.cheques.dueDateJalali, from));
    if (to)     clauses.push(lte(schema.cheques.dueDateJalali, to));

    const where = clauses.length ? and(...clauses) : undefined;

    const rows = await db
      .select({
        cheque: schema.cheques,
        contactName: schema.contacts.name,
      })
      .from(schema.cheques)
      .leftJoin(schema.contacts, eq(schema.cheques.contactId, schema.contacts.id))
      .where(where)
      .orderBy(desc(schema.cheques.dueDateJalali));

    const cheques = rows.map((r) => rowToCheque(r.cheque, r.contactName ?? null));
    return NextResponse.json({ cheques });
  } catch (e) {
    return handleError(e);
  }
}

/**
 * POST /api/cheques
 */
export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const input = createSchema.parse(await req.json());

    const branchId = input.branchId ?? (session.branchId ?? null);

    const [row] = await db.insert(schema.cheques).values({
      kind: input.kind,
      contactId: input.contactId ?? null,
      amount: input.amount,
      serialNo: input.serialNo ?? '',
      bankName: input.bankName ?? '',
      dueDateJalali: input.dueDateJalali,
      status: 'pending',
      note: input.note ?? '',
      branchId,
      createdBy: session.sub,
    }).returning();

    if (!row) throw new Error('خطا در ثبت چک');

    // بررسی سررسید نزدیک برای اعلان
    try {
      const dueDate = jalaliToDate(input.dueDateJalali);
      if (dueDate) {
        const daysUntil = Math.ceil((dueDate.getTime() - Date.now()) / 86_400_000);
        const [rule] = await db
          .select({ threshold: schema.notificationRules.threshold, enabled: schema.notificationRules.enabled })
          .from(schema.notificationRules)
          .where(eq(schema.notificationRules.key, 'cheque.dueSoon'))
          .limit(1);
        const threshold = rule?.enabled ? (rule.threshold ?? 3) : null;
        if (threshold != null && daysUntil >= 0 && daysUntil <= threshold) {
          const kindLabel = input.kind === 'received' ? 'دریافتی' : 'پرداختی';
          await notifyAdmins({
            type: 'warning',
            title: `چک ${kindLabel} نزدیک به سررسید`,
            sub: `چک ${input.serialNo || row.id.slice(0, 8)} · ${daysUntil === 0 ? 'امروز' : `${new Intl.NumberFormat('fa-IR').format(daysUntil)} روز دیگر`} · ${new Intl.NumberFormat('fa-IR').format(input.amount)} ت`,
            actionUrl: '/cheques',
            entityId: row.id,
            ruleKey: 'cheque.dueSoon',
          }, undefined, { sms: true });
        }
      }
    } catch { /* fire-and-forget */ }

    const [enriched] = await db
      .select({ cheque: schema.cheques, contactName: schema.contacts.name })
      .from(schema.cheques)
      .leftJoin(schema.contacts, eq(schema.cheques.contactId, schema.contacts.id))
      .where(eq(schema.cheques.id, row.id))
      .limit(1);

    return NextResponse.json({ cheque: rowToCheque(enriched!.cheque, enriched?.contactName ?? null) }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
