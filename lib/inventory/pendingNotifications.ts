import { notifyAdmins } from '@/lib/notify';

export async function createPendingNotifications(
  voucherId: string,
  title: string,
  _branchId: string
) {
  await notifyAdmins({
    type: 'pending',
    title: 'برگه انبار در انتظار تأیید',
    sub: title,
    actionUrl: `/inventory/cartable`,
    entityId: voucherId,
    ruleKey: 'voucher_pending',
  });
}
