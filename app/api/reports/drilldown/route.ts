import { NextResponse } from 'next/server';
import { eq, and, gte, lte, notInArray, isNull, or, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';

/**
 * GET /api/reports/drilldown
 * بازگشت تراکنش‌های خام یک بخش P&L یا یک دسته‌بندی مشخص
 *
 * segment: 'revenue' | 'cogs' | 'payroll' | 'other' | 'category'
 * categoryName: اگر segment='category' باشد، نام دسته الزامی است
 * from / to: جلالی — مثل گزارش اصلی
 * branchId: اختیاری (SuperAdmin)
 * limit: حداکثر نتایج (پیش‌فرض ۱۵)
 */

const COGS_CAT = 'بهای تمام‌شده (COGS)';
const PAYROLL_CAT = 'حقوق پرسنل';

const querySchema = z.object({
  segment: z.enum(['revenue', 'cogs', 'payroll', 'other', 'category']),
  categoryName: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  branchId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(15),
});

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const url = new URL(req.url);

    const params = querySchema.parse({
      segment: url.searchParams.get('segment'),
      categoryName: url.searchParams.get('categoryName') ?? undefined,
      from: url.searchParams.get('from') ?? undefined,
      to: url.searchParams.get('to') ?? undefined,
      branchId: url.searchParams.get('branchId') ?? undefined,
      limit: url.searchParams.get('limit') ?? 15,
    });

    const conditions = [eq(schema.transactions.status, 'approved')];

    // RBAC
    if (session.role === 'BranchUser' && session.branchId) {
      conditions.push(eq(schema.transactions.branchId, session.branchId));
    } else if (session.role === 'SuperAdmin' && params.branchId) {
      conditions.push(eq(schema.transactions.branchId, params.branchId));
    }

    // تاریخ
    if (params.from) conditions.push(gte(schema.transactions.date, params.from));
    if (params.to) conditions.push(lte(schema.transactions.date, params.to));

    // فیلتر بر اساس segment
    switch (params.segment) {
      case 'revenue':
        conditions.push(eq(schema.transactions.type, 'income'));
        break;
      case 'cogs':
        conditions.push(eq(schema.transactions.categoryName, COGS_CAT));
        break;
      case 'payroll':
        conditions.push(eq(schema.transactions.categoryName, PAYROLL_CAT));
        break;
      case 'other':
        conditions.push(eq(schema.transactions.type, 'expense'));
        conditions.push(
          or(
            isNull(schema.transactions.categoryName),
            notInArray(schema.transactions.categoryName, [COGS_CAT, PAYROLL_CAT])
          )!
        );
        break;
      case 'category':
        if (!params.categoryName) {
          return NextResponse.json({ error: 'categoryName is required for segment=category' }, { status: 400 });
        }
        conditions.push(eq(schema.transactions.categoryName, params.categoryName));
        break;
    }

    const rows = await db
      .select({
        id: schema.transactions.id,
        date: schema.transactions.date,
        title: schema.transactions.title,
        amount: schema.transactions.amount,
        type: schema.transactions.type,
        categoryName: schema.transactions.categoryName,
        payee: schema.transactions.payee,
        branchName: schema.transactions.branchName,
      })
      .from(schema.transactions)
      .where(and(...conditions))
      .orderBy(desc(schema.transactions.date))
      .limit(params.limit);

    // شمارش کل (بدون limit)
    const [countRow] = await db
      .select({ total: sql<string>`COUNT(*)` })
      .from(schema.transactions)
      .where(and(...conditions));

    return NextResponse.json({
      items: rows.map(r => ({
        ...r,
        amount: Number(r.amount),
      })),
      total: Number(countRow?.total ?? 0),
    });
  } catch (e) {
    return handleError(e);
  }
}
