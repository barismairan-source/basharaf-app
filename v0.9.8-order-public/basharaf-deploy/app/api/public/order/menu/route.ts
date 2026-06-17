import { NextResponse } from 'next/server';
import { ApiError, handleError } from '@/lib/api-error';
import { getPublicOrderMenu } from '@/lib/ordering/publicMenu';

export const dynamic = 'force-dynamic';

/**
 * GET /api/public/order/menu — منوی عمومی سفارش بیرون‌بر (بدون auth، فقط‌خواندنی).
 * فقط داده‌ی لازم برای /order: نام شعبه، وضعیت باز/بسته + حداقل سفارش،
 * و کاتالوگ بیرون‌بر (دسته‌ها + آیتم‌های موجود با قیمت resolve‌شده).
 */
export async function GET() {
  try {
    const menu = await getPublicOrderMenu();
    if (!menu) throw new ApiError(404, 'فروشگاه برای سفارش آنلاین در دسترس نیست', 'NO_BRANCH');
    return NextResponse.json(menu);
  } catch (e) {
    return handleError(e);
  }
}
