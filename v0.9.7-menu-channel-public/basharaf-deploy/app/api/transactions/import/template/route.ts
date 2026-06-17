import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requireSession } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

/** GET — دانلود فایل تمپلیت اکسل خالی با سرستون‌ها و یک ردیف نمونه. */
export async function GET() {
  try {
    await requireSession();
    const rows = [
      {
        'نوع': 'هزینه', 'عنوان': 'خرید مواد غذایی', 'مبلغ': 1500000,
        'تاریخ': '1405/03/16', 'شعبه': 'نام شعبه', 'صندوق': 'نام صندوق',
        'دسته': 'نام دسته (اختیاری)', 'طرف‌حساب': 'نام طرف‌حساب (اختیاری)',
        'نسیه': 'خیر', 'توضیح': 'توضیح اختیاری',
      },
      {
        'نوع': 'درآمد', 'عنوان': 'فروش روز', 'مبلغ': 8000000,
        'تاریخ': '1405/03/16', 'شعبه': 'نام شعبه', 'صندوق': 'نام صندوق',
        'دسته': '', 'طرف‌حساب': '', 'نسیه': 'خیر', 'توضیح': '',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 8 }, { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 16 },
      { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 6 }, { wch: 20 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'تراکنش‌ها');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="basharaf-transactions-template.xlsx"',
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
