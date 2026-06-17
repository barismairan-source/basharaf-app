import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requireSession } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireSession();
    // دو ردیف با یک شماره فاکتور = یک برگه با دو قلم
    const rows = [
      { 'شماره فاکتور': 'F-1001', 'تاریخ': '1405/03/16', 'شعبه': 'نام شعبه', 'کد قلم': 'MEAT-01', 'مقدار': 20000, 'بهای واحد': 1200, 'توضیح': 'خرید از قصابی' },
      { 'شماره فاکتور': 'F-1001', 'تاریخ': '1405/03/16', 'شعبه': 'نام شعبه', 'کد قلم': 'RICE-01', 'مقدار': 50000, 'بهای واحد': 850, 'توضیح': '' },
      { 'شماره فاکتور': 'F-1002', 'تاریخ': '1405/03/16', 'شعبه': 'نام شعبه', 'کد قلم': 'OIL-01', 'مقدار': 10000, 'بهای واحد': 600, 'توضیح': 'فاکتور دوم' },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'رسید خرید');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="basharaf-purchase-vouchers-template.xlsx"',
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
