import { NextResponse } from 'next/server';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';

/**
 * GET /api/export
 *
 * پارامترها (query string):
 * - format: 'json' | 'csv' (پیش‌فرض json)
 * - branchId: فیلتر شعبه (اختیاری، فقط SuperAdmin)
 * - status: 'all' | 'approved' | 'pending' | 'rejected'
 * - type: 'all' | 'income' | 'expense'
 * - from: تاریخ شروع ISO (اختیاری)
 * - to: تاریخ پایان ISO (اختیاری)
 *
 * Response برای json: آرایه‌ای از تراکنش‌ها
 * Response برای csv: فایل CSV با header فارسی
 */

const querySchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
  branchId: z.string().optional(),
  status: z.enum(['all', 'approved', 'pending', 'rejected']).default('all'),
  type: z.enum(['all', 'income', 'expense']).default('all'),
  from: z.string().optional(),
  to: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const url = new URL(req.url);

    const params = querySchema.parse({
      format: url.searchParams.get('format') ?? 'json',
      branchId: url.searchParams.get('branchId') ?? undefined,
      status: url.searchParams.get('status') ?? 'all',
      type: url.searchParams.get('type') ?? 'all',
      from: url.searchParams.get('from') ?? undefined,
      to: url.searchParams.get('to') ?? undefined,
    });

    // ─── Build conditions ───
    const conditions = [];

    // RBAC scope
    if (session.role === 'BranchUser' && session.branchId) {
      conditions.push(eq(schema.transactions.branchId, session.branchId));
    } else if (session.role === 'SuperAdmin' && params.branchId) {
      conditions.push(eq(schema.transactions.branchId, params.branchId));
    }

    if (params.status !== 'all') {
      conditions.push(eq(schema.transactions.status, params.status as any));
    }
    if (params.type !== 'all') {
      conditions.push(eq(schema.transactions.type, params.type as any));
    }
    if (params.from) {
      conditions.push(gte(schema.transactions.createdAt, new Date(params.from)));
    }
    if (params.to) {
      conditions.push(lte(schema.transactions.createdAt, new Date(params.to)));
    }

    const rows = await db
      .select()
      .from(schema.transactions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.transactions.createdAt));

    if (params.format === 'csv') {
      const csv = buildCSV(rows);
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="basharaf-transactions-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({ transactions: rows, total: rows.length });
  } catch (e) {
    return handleError(e);
  }
}

function buildCSV(rows: typeof schema.transactions.$inferSelect[]) {
  const BOM = '\uFEFF'; // برای نمایش صحیح فارسی در Excel
  const headers = [
    'شناسه',
    'نوع',
    'عنوان',
    'دسته',
    'مبلغ (تومان)',
    'طرف معامله',
    'شعبه',
    'روش پرداخت',
    'شماره رسید',
    'تاریخ',
    'وضعیت',
    'یادداشت',
    'تاریخ ثبت',
  ].join(',');

  const typeMap: Record<string, string> = {
    income: 'درآمد',
    expense: 'هزینه',
  };
  const statusMap: Record<string, string> = {
    approved: 'تایید شده',
    pending: 'در انتظار',
    rejected: 'رد شده',
  };

  const lines = rows.map((r) => {
    return [
      r.id,
      typeMap[r.type] ?? r.type,
      `"${r.title.replace(/"/g, '""')}"`,
      `"${r.categoryName}"`,
      r.amount,
      `"${r.payee}"`,
      `"${r.branchName}"`,
      `"${r.method}"`,
      r.receipt,
      r.date,
      statusMap[r.status] ?? r.status,
      `"${(r.note ?? '').replace(/"/g, '""')}"`,
      r.createdAt.toISOString(),
    ].join(',');
  });

  return BOM + [headers, ...lines].join('\n');
}
