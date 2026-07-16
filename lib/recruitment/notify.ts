import { notifyAdmins } from '@/lib/notify';
import { logEvent } from '@/lib/logger';

const AREA_LABELS: Record<string, string> = {
  kitchen: 'آشپزخانه',
  hall: 'تالار',
};

/** متن خلاصه‌ای که در notification و SMS می‌رود — فقط نام + برچسب بخش؛ بدون شماره، رزومه، پاسخ‌ها، یا سایر فیلدهای حساس. */
export function buildRecruitmentSub(
  firstName: string,
  lastName: string,
  area: string | null | undefined,
): string {
  const areaLabel = AREA_LABELS[area ?? ''] ?? area ?? '';
  return areaLabel
    ? `${firstName} ${lastName} — ${areaLabel}`
    : `${firstName} ${lastName}`;
}

/**
 * اعلان in-app برای SuperAdminها پس از ثبت درخواست استخدام.
 * Fire-and-forget — هیچ خطایی به caller بازنمی‌گردد.
 * فقط نام و بخش متقاضی منتقل می‌شود؛ شماره، رزومه، پاسخ‌ها، یا سایر فیلدهای حساس هرگز ارسال نمی‌شود.
 */
export function fireRecruitmentNotification(app: {
  id: string;
  firstName: string;
  lastName: string;
  area: string | null;
}): void {
  notifyAdmins(
    {
      ruleKey: 'recruitment.new_application',
      type: 'info',
      title: 'درخواست استخدام جدید',
      sub: buildRecruitmentSub(app.firstName, app.lastName, app.area),
      actionUrl: '/recruitment',
      entityId: app.id,
    },
    undefined,
    { sms: true, email: true },
  ).catch(() => {
    logEvent({
      level: 'warn',
      category: 'recruitment',
      message: 'notification failed after application insert',
      context: { entityId: app.id },
    }).catch(() => {});
  });
}
