import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

const closeBodySchema = z.object({
  jalaliYear: z.number().int().min(1300).max(1500),
  jalaliMonth: z.number().int().min(1).max(12),
});

/** GET /api/financial-periods — فهرست دوره‌های بسته */
export async function GET() {
  try {
    const session = await requireSession();
    if (session.role !== 'SuperAdmin') {
      throw new ApiError(403, 'فقط مدیر کل می‌تواند دوره‌های مالی را مشاهده کند', 'FORBIDDEN');
    }

    const periods = await db
      .select()
      .from(schema.financialPeriods)
      .orderBy(schema.financialPeriods.jalaliYear, schema.financialPeriods.jalaliMonth);

    return NextResponse.json({ periods });
  } catch (e) {
    return handleError(e);
  }
}

/** POST /api/financial-periods — بستن یک دوره‌ی مالی */
export async function POST(req: Request) {
  try {
    const session = await requireSession();
    if (session.role !== 'SuperAdmin') {
      throw new ApiError(403, 'فقط مدیر کل می‌تواند دوره‌ی مالی را ببندد', 'FORBIDDEN');
    }

    const input = closeBodySchema.parse(await req.json());

    const existing = await db
      .select({ id: schema.financialPeriods.id })
      .from(schema.financialPeriods)
      .where(
        and(
          eq(schema.financialPeriods.jalaliYear, input.jalaliYear),
          eq(schema.financialPeriods.jalaliMonth, input.jalaliMonth)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new ApiError(409, 'این دوره‌ی مالی قبلاً بسته شده است', 'PERIOD_ALREADY_CLOSED');
    }

    const [period] = await db
      .insert(schema.financialPeriods)
      .values({
        jalaliYear: input.jalaliYear,
        jalaliMonth: input.jalaliMonth,
        closedBy: session.sub,
      })
      .returning();

    return NextResponse.json({ period }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}

/** DELETE /api/financial-periods — بازگشایی یک دوره‌ی مالی */
export async function DELETE(req: Request) {
  try {
    const session = await requireSession();
    if (session.role !== 'SuperAdmin') {
      throw new ApiError(403, 'فقط مدیر کل می‌تواند دوره‌ی مالی را بازگشایی کند', 'FORBIDDEN');
    }

    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get('year') ?? '', 10);
    const month = parseInt(searchParams.get('month') ?? '', 10);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      throw new ApiError(400, 'پارامترهای year و month اجباری هستند', 'INVALID_PARAMS');
    }

    const result = await db
      .delete(schema.financialPeriods)
      .where(
        and(
          eq(schema.financialPeriods.jalaliYear, year),
          eq(schema.financialPeriods.jalaliMonth, month)
        )
      )
      .returning({ id: schema.financialPeriods.id });

    if (result.length === 0) {
      throw new ApiError(404, 'این دوره‌ی مالی بسته نشده بود', 'PERIOD_NOT_FOUND');
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
