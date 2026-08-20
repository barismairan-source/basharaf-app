import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

type SettingsRow = typeof schema.reservationSettings.$inferSelect;

function serialize(s: SettingsRow) {
  return {
    id: s.id,
    branchId: s.branchId,
    isPublicEnabled: s.isPublicEnabled,
    workingDays: s.workingDays,
    openTime: s.openTime,
    closeTime: s.closeTime,
    slotMinutes: s.slotMinutes,
    slotCapacityGuests: s.slotCapacityGuests,
    maxPartySize: s.maxPartySize,
    minLeadMinutes: s.minLeadMinutes,
    maxLeadDays: s.maxLeadDays,
    blackoutDates: s.blackoutDates,
    maxActiveReservationsPerPhone: s.maxActiveReservationsPerPhone,
    updatedAt: s.updatedAt.toISOString(),
  };
}

/** برای شعبه‌ای که هنوز ردیف تنظیمات ندارد — مقادیر پیش‌فرض ستون‌ها (بدون insert). */
function defaults(branchId: string) {
  return {
    id: null as string | null,
    branchId,
    isPublicEnabled: false,
    workingDays: null as number[] | null,
    openTime: '12:00',
    closeTime: '23:00',
    slotMinutes: 30,
    slotCapacityGuests: 40,
    maxPartySize: 12,
    minLeadMinutes: 60,
    maxLeadDays: 30,
    blackoutDates: [] as string[],
    maxActiveReservationsPerPhone: 3,
    updatedAt: null as string | null,
  };
}

function resolveScopedBranchId(session: { role: string; branchId: string | null }, queryBranchId: string | null): string {
  if (session.role === 'SuperAdmin') {
    if (!queryBranchId) throw new ApiError(400, 'شعبه را انتخاب کنید', 'BRANCH_REQUIRED');
    return queryBranchId;
  }
  if (session.role !== 'BranchUser' || !session.branchId) {
    throw new ApiError(403, 'دسترسی ندارید', 'FORBIDDEN');
  }
  return session.branchId;
}

/** GET /api/reservations/settings?branchId= — تنظیمات رزرو یک شعبه (یا پیش‌فرض اگر هنوز ثبت نشده). */
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const url = new URL(req.url);
    const branchId = resolveScopedBranchId(session, url.searchParams.get('branchId'));

    const [row] = await db.select().from(schema.reservationSettings)
      .where(eq(schema.reservationSettings.branchId, branchId)).limit(1);
    return NextResponse.json({ settings: row ? serialize(row) : defaults(branchId) });
  } catch (e) {
    return handleError(e);
  }
}

const putSchema = z.object({
  branchId: z.string().uuid().optional(),
  isPublicEnabled: z.boolean(),
  workingDays: z.array(z.number().int().min(0).max(6)).nullable(),
  openTime: z.string().regex(/^\d{1,2}:\d{2}$/),
  closeTime: z.string().regex(/^\d{1,2}:\d{2}$/),
  slotMinutes: z.number().int().min(5).max(240),
  slotCapacityGuests: z.number().int().min(1).max(2000),
  maxPartySize: z.number().int().min(1).max(200),
  minLeadMinutes: z.number().int().min(0).max(10080),
  maxLeadDays: z.number().int().min(1).max(365),
  blackoutDates: z.array(z.string()).max(200),
  maxActiveReservationsPerPhone: z.number().int().min(1).max(50),
});

/** PUT /api/reservations/settings — ایجاد/به‌روزرسانی تنظیمات (upsert). */
export async function PUT(req: Request) {
  try {
    const session = await requireSession();
    const input = putSchema.parse(await req.json());
    const branchId = resolveScopedBranchId(session, input.branchId ?? null);

    if (input.closeTime <= input.openTime) {
      throw new ApiError(400, 'ساعت پایان باید بعد از ساعت شروع باشد', 'INVALID_HOURS');
    }

    const values = {
      branchId,
      isPublicEnabled: input.isPublicEnabled,
      workingDays: input.workingDays,
      openTime: input.openTime,
      closeTime: input.closeTime,
      slotMinutes: input.slotMinutes,
      slotCapacityGuests: input.slotCapacityGuests,
      maxPartySize: input.maxPartySize,
      minLeadMinutes: input.minLeadMinutes,
      maxLeadDays: input.maxLeadDays,
      blackoutDates: input.blackoutDates,
      maxActiveReservationsPerPhone: input.maxActiveReservationsPerPhone,
    };

    const [row] = await db.insert(schema.reservationSettings).values(values)
      .onConflictDoUpdate({ target: schema.reservationSettings.branchId, set: values })
      .returning();
    if (!row) throw new ApiError(500, 'خطا در ذخیره‌ی تنظیمات', 'UPSERT_FAILED');
    return NextResponse.json({ settings: serialize(row) });
  } catch (e) {
    return handleError(e);
  }
}
