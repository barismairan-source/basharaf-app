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
    tableCount: s.tableCount,
    maxPartySize: s.maxPartySize,
    maxActiveReservationsPerPhone: s.maxActiveReservationsPerPhone,
    closedMessage: s.closedMessage,
    closedPhone: s.closedPhone,
    updatedAt: s.updatedAt.toISOString(),
  };
}

/** برای شعبه‌ای که هنوز ردیف تنظیمات ندارد — مقادیر پیش‌فرض ستون‌ها (بدون insert). */
function defaults(branchId: string) {
  return {
    id: null as string | null,
    branchId,
    isPublicEnabled: false,
    tableCount: 5,
    maxPartySize: 12,
    maxActiveReservationsPerPhone: 3,
    closedMessage: null as string | null,
    closedPhone: null as string | null,
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
  tableCount: z.number().int().min(1).max(500),
  maxPartySize: z.number().int().min(1).max(200),
  maxActiveReservationsPerPhone: z.number().int().min(1).max(50),
  closedMessage: z.string().trim().max(300).nullable().optional(),
  closedPhone: z.string().trim().max(20).nullable().optional(),
});

/** PUT /api/reservations/settings — ایجاد/به‌روزرسانی تنظیمات (upsert). */
export async function PUT(req: Request) {
  try {
    const session = await requireSession();
    const input = putSchema.parse(await req.json());
    const branchId = resolveScopedBranchId(session, input.branchId ?? null);

    const values = {
      branchId,
      isPublicEnabled: input.isPublicEnabled,
      tableCount: input.tableCount,
      maxPartySize: input.maxPartySize,
      maxActiveReservationsPerPhone: input.maxActiveReservationsPerPhone,
      closedMessage: input.closedMessage || null,
      closedPhone: input.closedPhone || null,
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
