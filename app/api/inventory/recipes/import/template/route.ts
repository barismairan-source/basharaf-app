import { NextResponse } from 'next/server';
import { utils, write } from 'xlsx';
import { requireSession } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';

/**
 * GET /api/inventory/recipes/import/template
 *
 * فایل Excel الگو را با سه شیت و ردیف‌های نمونه تولید و ارسال می‌کند.
 */
export async function GET() {
  try {
    await requireSession();

    const wb = utils.book_new();

    // ── Sheet 1: مواد خام ─────────────────────────────────────────
    const rawData = [
      ['نام', 'واحد', 'قیمت خرید', 'کد', 'دسته‌بندی'],
      ['گوشت چرخ‌کرده', 'kg', 850000, 'MEAT-01', 'پروتئین'],
      ['روغن آفتابگردان', 'L', 65000, 'OIL-01', 'روغن'],
      ['نمک', 'kg', 8000, 'SALT-01', 'ادویه'],
      ['پیاز', 'kg', 25000, '', 'سبزیجات'],
    ];
    const ws1 = utils.aoa_to_sheet(rawData);
    ws1['!cols'] = [{ wch: 22 }, { wch: 8 }, { wch: 16 }, { wch: 12 }, { wch: 16 }];
    utils.book_append_sheet(wb, ws1, '۱_مواد خام');

    // ── Sheet 2: زیررسپی ──────────────────────────────────────────
    // ستون‌های ثابت + جفت‌های ماده/مقدار (تا ۵ ماده نمونه)
    const prepData = [
      ['نام', 'واحد', 'بازده بچ', 'ماندگاری (روز)', 'کد', 'ماده ۱', 'مقدار ۱', 'ماده ۲', 'مقدار ۲', 'ماده ۳', 'مقدار ۳'],
      ['مخلوط کوبیده', 'kg', 1800, 1, 'PREP-KFT', 'گوشت چرخ‌کرده', 1000, 'پیاز', 400, 'نمک', 20],
      ['سس ماریناد', 'L', 500, 3, '', 'روغن آفتابگردان', 300, 'نمک', 10, '', ''],
    ];
    const ws2 = utils.aoa_to_sheet(prepData);
    ws2['!cols'] = [
      { wch: 22 }, { wch: 8 }, { wch: 12 }, { wch: 16 }, { wch: 12 },
      { wch: 20 }, { wch: 10 }, { wch: 20 }, { wch: 10 }, { wch: 20 }, { wch: 10 },
    ];
    utils.book_append_sheet(wb, ws2, '۲_زیررسپی');

    // ── Sheet 3: پرس نهایی ────────────────────────────────────────
    const mainData = [
      ['نام', 'تعداد پرس', 'قیمت فروش', 'نوع پخت', 'food cost هدف', 'ماده ۱', 'مقدار ۱', 'ماده ۲', 'مقدار ۲', 'ماده ۳', 'مقدار ۳'],
      ['کوبیده کباب', 10, 280000, 'daily', 30, 'مخلوط کوبیده', 1800, 'نمک', 5, '', ''],
      ['مرغ بریان', 8, 320000, 'batch', 28, 'مرغ', 2400, 'سس ماریناد', 300, 'نمک', 15],
    ];
    const ws3 = utils.aoa_to_sheet(mainData);
    ws3['!cols'] = [
      { wch: 22 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 16 },
      { wch: 20 }, { wch: 10 }, { wch: 20 }, { wch: 10 }, { wch: 20 }, { wch: 10 },
    ];
    utils.book_append_sheet(wb, ws3, '۳_پرس نهایی');

    const raw = write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    // Copy into a fresh ArrayBuffer so NextResponse can accept it as BodyInit
    const body: ArrayBuffer = new Uint8Array(raw).buffer;

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="recipe-import-template.xlsx"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
