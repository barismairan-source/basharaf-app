import { NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession, requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

const createSchema = z.object({
  name: z.string().min(2).max(120).transform(v => v.trim()),
  type: z.string().min(1).max(50).default('customer'),
  phone: z.string().max(20).optional().nullable(),
  note: z.string().max(300).optional().nullable(),
});

export async function GET() {
  try {
    await requireSession();

    const rows = await db.select().from(schema.contacts).where(eq(schema.contacts.isActive, true));

    // مانده فقط از نسیه (isCredit=true) محاسبه می‌شود — پرداخت نقدی مانده نمی‌سازد
    const balanceRows = await db
      .select({
        contactId: schema.transactions.contactId,
        balance: sql<string>`
          COALESCE(
            SUM(
              CASE WHEN ${schema.transactions.type} = 'income'
                THEN ${schema.transactions.amount}
                ELSE -${schema.transactions.amount}
              END
            ),
            0
          )
        `,
      })
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.status, 'approved'),
          eq(schema.transactions.isCredit, true),
        )
      )
      .groupBy(schema.transactions.contactId);

    const balanceMap = new Map<string, number>(
      balanceRows
        .filter(r => r.contactId !== null)
        .map(r => [r.contactId as string, Number(r.balance)])
    );

    return NextResponse.json({
      contacts: rows.map(c => ({
        id: c.id, name: c.name, type: c.type, phone: c.phone, note: c.note,
        balance: balanceMap.get(c.id) ?? 0,
        isActive: c.isActive,
        createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString(),
      })),
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const input = createSchema.parse(await req.json());
    const [c] = await db.insert(schema.contacts).values({
      name: input.name, type: input.type,
      phone: input.phone ?? null, note: input.note ?? null,
    }).returning();
    if (!c) throw new ApiError(500, 'خطا در ساخت طرف‌حساب', 'INSERT_FAILED');
    return NextResponse.json({
      contact: { ...c, balance: 0, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() },
    }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
