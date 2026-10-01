import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import type { JWTPayload } from './jwt';

/**
 * دسترسی «تازه» از دیتابیس برای هر درخواست API.
 *
 * چرا: JWT سی‌روزه است و role/branchId/permissions داخلش baked می‌شود. بدون این
 * لایه، کاربری که غیرفعال یا تنزل نقش داده شده تا انقضای توکن همچنان با همان
 * اختیارات قبلی به API دسترسی داشت (middleware فقط صفحه‌ها را چک می‌کرد).
 *
 * کش کوتاه (چند ثانیه) per-user تا هر درخواست یک کوئری اضافه نزند؛ بعد از تغییر
 * کاربر توسط مدیر، invalidateFreshAccess صدا زده می‌شود تا اثر فوری باشد.
 */

export interface FreshAccess {
  role: JWTPayload['role'];
  branchId: string | null;
  permissions: string[] | null;
}

const TTL_MS = 5_000;
const cache = new Map<string, { value: FreshAccess | null; expires: number }>();

/** null یعنی کاربر وجود ندارد یا غیرفعال است — نشست باید نامعتبر تلقی شود. */
export async function getFreshAccess(userId: string): Promise<FreshAccess | null> {
  const now = Date.now();
  const hit = cache.get(userId);
  if (hit && hit.expires > now) return hit.value;

  const [user] = await db
    .select({
      role: schema.users.role,
      branchId: schema.users.assignedBranchId,
      permissions: schema.users.permissions,
      isActive: schema.users.isActive,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  const value: FreshAccess | null =
    user && user.isActive
      ? { role: user.role, branchId: user.branchId ?? null, permissions: user.permissions ?? null }
      : null;

  cache.set(userId, { value, expires: now + TTL_MS });
  return value;
}

/** بعد از ویرایش نقش/شعبه/دسترسی/فعال‌بودن یک کاربر صدا زده شود. */
export function invalidateFreshAccess(userId: string): void {
  cache.delete(userId);
}
