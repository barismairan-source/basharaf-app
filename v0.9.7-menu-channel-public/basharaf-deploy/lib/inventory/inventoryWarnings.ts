import { eq } from 'drizzle-orm';
import { schema } from '@/lib/db/client';
import { audit } from '@/lib/auth/audit';

/**
 * هشدار + ردپای کسری clamp انبار — وقتی issueConfirmed به‌خاطر نبود موجودی کافی
 * مقدار درخواستی را کم می‌کند (clamp)، به‌جای کسری بی‌صدا:
 *   ۱. در audit_log با action='inventory_clamp_warning' ثبت می‌شود.
 *   ۲. به همه‌ی SuperAdminها اعلان داده می‌شود.
 * هم‌الگوی notification در applyMenuSaleDeduction
 * (app/api/transactions/[id]/approve/route.ts، اعلان «موجودی ناکافی در فروش منو»).
 */
export async function warnAndLogClamp(
  tx: any,
  params: {
    itemId: string;
    itemName: string;
    itemUnit: string;
    branchId: string | null;
    voucherId: string | null;
    requested: number;
    available: number;
  }
): Promise<void> {
  const { itemId, itemName, itemUnit, branchId, voucherId, requested, available } = params;
  const shortfall = requested - available;

  audit({
    action: 'inventory_clamp_warning',
    meta: { itemId, voucherId, branchId, requested, available, shortfall },
  });

  const admins = await tx.select({ id: schema.users.id })
    .from(schema.users).where(eq(schema.users.role, 'SuperAdmin'));
  for (const admin of admins) {
    await tx.insert(schema.notifications).values({
      type: 'info',
      title: 'کسری موجودی هنگام کسر انبار',
      sub: `کسر انبار از موجودی بیشتر بود — قلم «${itemName}»، درخواست ${requested.toLocaleString('fa-IR')} ${itemUnit}، موجودی ${available.toLocaleString('fa-IR')} ${itemUnit}`.slice(0, 200),
      time: 'به‌تازگی',
      read: false,
      userId: admin.id,
    });
  }
}
