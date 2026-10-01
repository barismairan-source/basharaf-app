import { z } from 'zod';
import { normalizeJalaliDate } from '@/lib/jalali';

/** فیلد تاریخ شمسی در body/query API — همیشه به فرمت استاندارد `۱۴۰۵/۰۲/۳۱` تبدیل می‌شود. */
export const jalaliDateField = z.string().transform((v, ctx) => {
  const normalized = normalizeJalaliDate(v);
  if (!normalized) {
    ctx.addIssue({ code: 'custom', message: 'تاریخ شمسی نامعتبر است (مثل ۱۴۰۵/۰۳/۱۶)' });
    return z.NEVER;
  }
  return normalized;
});
