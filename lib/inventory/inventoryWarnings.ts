import { schema } from '@/lib/db/client';
import { audit } from '@/lib/auth/audit';
import { notifyAdmins } from '@/lib/notify';

/**
 * هشدار + ردپای کسری clamp انبار — وقتی issueConfirmed به‌خاطر نبود موجودی کافی
 * مقدار درخواستی را کم می‌کند (clamp)، به‌جای کسری بی‌صدا:
 *   ۱. در audit_log با action='inventory_clamp_warning' ثبت می‌شود.
 *   ۲. به همه‌ی SuperAdminها اعلان داده می‌شود.
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

  await notifyAdmins(
    {
      type: 'warning',
      title: 'کسری موجودی هنگام کسر انبار',
      sub: `قلم «${itemName}»، درخواست ${requested.toLocaleString('fa-IR')} ${itemUnit}، موجودی ${available.toLocaleString('fa-IR')} ${itemUnit}`,
      actionUrl: voucherId ? `/inventory/cartable` : `/inventory`,
      entityId: voucherId ?? undefined,
      ruleKey: 'inventory_clamp',
      branchId,
    },
    tx
  );
}
