import { and, eq, gt, desc } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { ApiError } from '@/lib/api-error';
import {
  checkOtpRateLimit,
  recordOtpFailedAttempt,
  clearOtpAttempts,
  OTP_MAX_ATTEMPTS,
} from '@/lib/auth/rateLimit';

const OTP_EXPIRE_MS = 5 * 60 * 1000; // ۵ دقیقه
const OTP_SPAM_MS = 2 * 60 * 1000;   // ضد-اسپم: اگر OTP فعال در ۲ دقیقه اخیر وجود دارد → 429

/** اعتبارسنجی شماره موبایل ایران: ۱۱ رقم، شروع با ۰ */
export function isValidIranPhone(phone: string): boolean {
  return /^0[0-9]{10}$/.test(phone);
}

/** گرفتن یا ساخت مشتری آنلاین بر اساس شماره تلفن */
export async function getOrCreateWebCustomer(
  phone: string,
  name?: string
): Promise<typeof schema.webCustomers.$inferSelect> {
  const [existing] = await db
    .select()
    .from(schema.webCustomers)
    .where(eq(schema.webCustomers.phone, phone))
    .limit(1);

  if (existing) {
    if (name && name.trim() && !existing.name) {
      const [updated] = await db
        .update(schema.webCustomers)
        .set({ name: name.trim() })
        .where(eq(schema.webCustomers.id, existing.id))
        .returning();
      return updated!;
    }
    return existing;
  }

  const [created] = await db
    .insert(schema.webCustomers)
    .values({ phone, name: name?.trim() || null })
    .returning();
  return created!;
}

/**
 * ساخت OTP جدید برای شماره تلفن.
 * اگر OTP فعال در ۲ دقیقه اخیر وجود داشته باشد → ApiError 429
 */
export async function createWebOtp(phone: string): Promise<string> {
  const spamCutoff = new Date(Date.now() - OTP_SPAM_MS);

  const [recentOtp] = await db
    .select()
    .from(schema.webCustomerOtp)
    .where(
      and(
        eq(schema.webCustomerOtp.phone, phone),
        eq(schema.webCustomerOtp.used, false),
        gt(schema.webCustomerOtp.expiresAt, spamCutoff)
      )
    )
    .limit(1);

  if (recentOtp) {
    throw new ApiError(429, 'کد تأیید قبلی هنوز فعال است — لطفاً ۲ دقیقه صبر کنید', 'OTP_TOO_SOON');
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + OTP_EXPIRE_MS);

  await db.insert(schema.webCustomerOtp).values({ phone, code, expiresAt, used: false });

  // mock SMS — فقط در development؛ در production حذف شود با SMS provider واقعی
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[OTP MOCK] شماره ${phone} — کد: ${code} (منقضی: ${expiresAt.toISOString()})`);
  }

  return code;
}

/**
 * تأیید OTP — اگر معتبر باشد مشتری را برمی‌گرداند، در غیر این صورت null.
 * کد را بعد از استفاده به used=true تبدیل می‌کند.
 *
 * Rate limiting: حداکثر OTP_MAX_ATTEMPTS تلاش ناموفق روی یک شماره در ۱۵ دقیقه.
 * بعد از رسیدن به حد، OTP فعال invalidate می‌شود تا مهاجم نتواند با OTP جدید ادامه دهد.
 */
export async function verifyWebOtp(
  phone: string,
  code: string
): Promise<typeof schema.webCustomers.$inferSelect | null> {
  // ۱. بررسی rate limit قبل از هر query
  const { allowed } = checkOtpRateLimit(phone);
  if (!allowed) {
    throw new ApiError(429, 'تعداد تلاش بیش از حد — دوباره کد بگیرید', 'OTP_TOO_MANY_ATTEMPTS');
  }

  const now = new Date();

  const [otp] = await db
    .select()
    .from(schema.webCustomerOtp)
    .where(
      and(
        eq(schema.webCustomerOtp.phone, phone),
        eq(schema.webCustomerOtp.code, code),
        eq(schema.webCustomerOtp.used, false),
        gt(schema.webCustomerOtp.expiresAt, now)
      )
    )
    .limit(1);

  if (!otp) {
    // ۲. کد اشتباه — ثبت تلاش ناموفق
    const failCount = recordOtpFailedAttempt(phone);
    if (failCount >= OTP_MAX_ATTEMPTS) {
      // OTP فعال را باطل کن تا مهاجم با همان OTP ادامه ندهد
      await db
        .update(schema.webCustomerOtp)
        .set({ used: true })
        .where(
          and(
            eq(schema.webCustomerOtp.phone, phone),
            eq(schema.webCustomerOtp.used, false),
            gt(schema.webCustomerOtp.expiresAt, now)
          )
        );
      throw new ApiError(429, 'تعداد تلاش بیش از حد — دوباره کد بگیرید', 'OTP_TOO_MANY_ATTEMPTS');
    }
    return null;
  }

  // ۳. کد درست — پاک کردن counter و mark as used
  clearOtpAttempts(phone);
  await db
    .update(schema.webCustomerOtp)
    .set({ used: true })
    .where(eq(schema.webCustomerOtp.id, otp.id));

  return getOrCreateWebCustomer(phone);
}

/** آدرس‌های ذخیره‌شده مشتری */
export async function getWebCustomerAddresses(
  customerId: string
): Promise<typeof schema.webCustomerAddresses.$inferSelect[]> {
  return db
    .select()
    .from(schema.webCustomerAddresses)
    .where(eq(schema.webCustomerAddresses.customerId, customerId))
    .orderBy(schema.webCustomerAddresses.sortOrder, schema.webCustomerAddresses.isDefault);
}

export interface AddressInput {
  title: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
  isDefault?: boolean;
}

/** افزودن آدرس جدید — اگر isDefault=true باشد، سایر آدرس‌ها را غیرپیش‌فرض می‌کند */
export async function addWebCustomerAddress(
  customerId: string,
  input: AddressInput
): Promise<typeof schema.webCustomerAddresses.$inferSelect> {
  if (input.isDefault) {
    await db
      .update(schema.webCustomerAddresses)
      .set({ isDefault: false })
      .where(eq(schema.webCustomerAddresses.customerId, customerId));
  }

  const [created] = await db
    .insert(schema.webCustomerAddresses)
    .values({
      customerId,
      title: input.title.trim(),
      address: input.address.trim(),
      lat: input.lat != null ? String(input.lat) : null,
      lng: input.lng != null ? String(input.lng) : null,
      isDefault: input.isDefault ?? false,
      sortOrder: 0,
    })
    .returning();
  return created!;
}

/** به‌روزرسانی آدرس — فقط اگر متعلق به همین مشتری باشد */
export async function updateWebCustomerAddress(
  customerId: string,
  addressId: string,
  patch: Partial<AddressInput>
): Promise<typeof schema.webCustomerAddresses.$inferSelect | null> {
  if (patch.isDefault) {
    await db
      .update(schema.webCustomerAddresses)
      .set({ isDefault: false })
      .where(eq(schema.webCustomerAddresses.customerId, customerId));
  }

  const updates: Record<string, unknown> = {};
  if (patch.title !== undefined) updates.title = patch.title.trim();
  if (patch.address !== undefined) updates.address = patch.address.trim();
  if (patch.lat !== undefined) updates.lat = patch.lat != null ? String(patch.lat) : null;
  if (patch.lng !== undefined) updates.lng = patch.lng != null ? String(patch.lng) : null;
  if (patch.isDefault !== undefined) updates.isDefault = patch.isDefault;

  const [updated] = await db
    .update(schema.webCustomerAddresses)
    .set(updates)
    .where(
      and(
        eq(schema.webCustomerAddresses.id, addressId),
        eq(schema.webCustomerAddresses.customerId, customerId)
      )
    )
    .returning();
  return updated ?? null;
}

/** حذف آدرس — فقط اگر متعلق به همین مشتری باشد */
export async function deleteWebCustomerAddress(
  customerId: string,
  addressId: string
): Promise<boolean> {
  const result = await db
    .delete(schema.webCustomerAddresses)
    .where(
      and(
        eq(schema.webCustomerAddresses.id, addressId),
        eq(schema.webCustomerAddresses.customerId, customerId)
      )
    )
    .returning({ id: schema.webCustomerAddresses.id });
  return result.length > 0;
}

/** تاریخچه سفارش‌های مشتری */
export async function getWebCustomerOrders(customerId: string) {
  return db
    .select({
      id: schema.orders.id,
      orderNo: schema.orders.orderNo,
      trackToken: schema.orders.trackToken,
      status: schema.orders.status,
      serviceType: schema.orders.serviceType,
      total: schema.orders.total,
      payMethod: schema.orders.payMethod,
      payStatus: schema.orders.payStatus,
      jalaliDate: schema.orders.jalaliDate,
      createdAt: schema.orders.createdAt,
    })
    .from(schema.orders)
    .where(eq(schema.orders.orderCustomerId, customerId))
    .orderBy(desc(schema.orders.createdAt))
    .limit(50);
}

/** اتصال سفارش به مشتری آنلاین (بعد از ثبت موفق) */
export async function linkOrderToWebCustomer(
  orderId: string,
  customerId: string
): Promise<void> {
  await db
    .update(schema.orders)
    .set({ orderCustomerId: customerId })
    .where(eq(schema.orders.id, orderId));
}
