import { NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession, requireAdmin } from '@/lib/auth/session';
import { ApiError, handleErrorLogged } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

const createSchema = z.object({
  hourlyRate: z.number().int().positive('نرخ ساعتی باید مثبت باشد'),
  effectiveFrom: z.string().regex(dateRe, 'فرمت تاریخ باید YYYY-MM-DD باشد'),
  reason: z.string().max(500).nullable().optional(),
});

function rowToRate(row: typeof schema.employeeHourlyRates.$inferSelect) {
  return {
    id: row.id, employeeId: row.employeeId, hourlyRate: Number(row.hourlyRate),
    effectiveFrom: row.effectiveFrom.toISOString().slice(0, 10),
    effectiveTo: row.effectiveTo ? row.effectiveTo.toISOString().slice(0, 10) : null,
    createdBy: row.createdBy, reason: row.reason,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireSession();
    const rows = await db.select().from(schema.employeeHourlyRates)
      .where(eq(schema.employeeHourlyRates.employeeId, params.id))
      .orderBy(desc(schema.employeeHourlyRates.effectiveFrom));
    return NextResponse.json({ rates: rows.map(rowToRate) });
  } catch (e) {
    return await handleErrorLogged(e, undefined, { category: 'payroll' });
  }
}

/**
 * ثبت نرخ جدید. نرخ‌های قبلی دست‌نخورده می‌مانند (فیش‌های محاسبه‌شده‌ی گذشته
 * از snapshot خودشان استفاده می‌کنند، نه این جدول). اگر effectiveFrom داخل
 * بازه‌ی یک نرخ فعال دیگر بیفتد، آن نرخ در همان تاریخ بسته می‌شود (effectiveTo
 * = روز قبل) تا در هر لحظه فقط یک نرخ فعال وجود داشته باشد.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdmin();
    const input = createSchema.parse(await req.json());

    const [employee] = await db.select().from(schema.employees)
      .where(eq(schema.employees.id, params.id)).limit(1);
    if (!employee) throw new ApiError(404, 'پرسنل پیدا نشد', 'NOT_FOUND');

    const result = await db.transaction(async (tx) => {
      const existing = await tx.select().from(schema.employeeHourlyRates)
        .where(eq(schema.employeeHourlyRates.employeeId, params.id));

      // هر نرخ فعال (بدون effectiveTo یا با effectiveTo >= تاریخ جدید) که با
      // نرخ جدید هم‌پوشان است، در روز قبل از شروع نرخ جدید بسته می‌شود.
      const dayBefore = new Date(input.effectiveFrom + 'T00:00:00Z');
      dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
      const dayBeforeStr = dayBefore.toISOString().slice(0, 10);

      for (const rt of existing) {
        const from = rt.effectiveFrom.toISOString().slice(0, 10);
        const to = rt.effectiveTo ? rt.effectiveTo.toISOString().slice(0, 10) : null;
        const overlaps = from <= input.effectiveFrom && (to === null || to >= input.effectiveFrom);
        if (overlaps) {
          if (from > dayBeforeStr) {
            throw new ApiError(409, 'نرخ جدید نمی‌تواند قبل از شروع نرخ فعال فعلی باشد', 'RATE_OVERLAP');
          }
          await tx.update(schema.employeeHourlyRates)
            .set({ effectiveTo: dayBefore })
            .where(eq(schema.employeeHourlyRates.id, rt.id));
        }
      }

      const [row] = await tx.insert(schema.employeeHourlyRates).values({
        employeeId: params.id,
        hourlyRate: input.hourlyRate,
        effectiveFrom: new Date(input.effectiveFrom + 'T00:00:00Z'),
        createdBy: session.sub,
        reason: input.reason ?? null,
      }).returning();
      if (!row) throw new ApiError(500, 'خطا در ثبت نرخ', 'INSERT_FAILED');
      return row;
    });

    return NextResponse.json({ rate: rowToRate(result) }, { status: 201 });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
