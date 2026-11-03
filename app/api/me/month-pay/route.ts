import { NextResponse } from 'next/server';
import { handleErrorLogged } from '@/lib/api-error';
import { getTodayJalali } from '@/lib/jalali';
import { requireMe, requireUnlocked } from '@/lib/staff-panel/session';
import { isValidPeriod, toLatinDigits } from '@/lib/staff-panel/pure';
import { loadMonthToDate } from '@/lib/staff-panel/monthPayServer';

export const dynamic = 'force-dynamic';

/**
 * GET /api/me/month-pay?period=YYYY-MM — حقوق همین ماه تا امروز بر اساس حضورهای ثبت‌شده
 * (تأییدشده و با منتظر تأیید، جدا) و روش محاسبه‌ی خود فرد. نیاز به قفل Face ID باز.
 */
export async function GET(req: Request) {
  try {
    const device = await requireMe();
    await requireUnlocked(device);
    const requested = new URL(req.url).searchParams.get('period');
    const [jy, jm] = toLatinDigits(getTodayJalali()).split('/');
    const period = isValidPeriod(requested) ? requested : `${jy}-${jm}`;
    return NextResponse.json({ period, month: await loadMonthToDate(device.employeeId, period) });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
