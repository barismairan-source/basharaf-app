import { notifyAdmins } from '@/lib/notify';
import { logEvent } from '@/lib/logger';

/**
 * اعلان in-app برای مدیران پس از ثبت یک رزرو عمومی جدید.
 * Fire-and-forget — هیچ خطایی به caller بازنمی‌گردد (مطابق الگوی
 * lib/recruitment/notify.ts). فقط نام مهمان و ساعت منتقل می‌شود؛
 * شماره‌ی موبایل هرگز در متن اعلان نمی‌آید.
 */
export function fireReservationNotification(input: {
  reservationId: string;
  branchId: string;
  guestName: string;
  date: string;
  time: string;
}): void {
  notifyAdmins(
    {
      ruleKey: 'reservations.new_public',
      type: 'info',
      title: 'رزرو عمومی جدید',
      sub: `${input.guestName} — ${input.date} ساعت ${input.time}`,
      actionUrl: '/reservations',
      entityId: input.reservationId,
      branchId: input.branchId,
    },
    undefined,
    { sms: false, email: false },
  ).catch(() => {
    logEvent({
      level: 'warn',
      category: 'reservations',
      message: 'notification failed after public reservation insert',
      context: { entityId: input.reservationId },
    }).catch(() => {});
  });
}
