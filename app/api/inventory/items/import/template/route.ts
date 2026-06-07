import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requireSession } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireSession();
    const rows = [
      {
        'کد': 'MEAT-01', 'نام': 'گوشت چرخ‌کرده', 'دسته': 'پروتئین', 'نوع': 'اولیه',
        'واحد': 'کیلوگرم', 'مقدار هر واحد': 1000, 'بازده': 95,
        'موجودی اولیه': 20000, 'بهای واحد': 1200000, 'حداقل موجودی': 5000, 'شعبه': 'نام شعبه',
      },
      {
        'کد': 'RICE-01', 'نام': 'برنج', 'دسته': 'غلات', 'نوع': 'اولیه',
        'واحد': 'کیلوگرم', 'مقدار هر واحد': 1000, 'بازده': 100,
        'موجودی اولیه': 50000, 'بهای واحد': 850000, 'حداقل موجودی': 10000, 'شعبه': 'نام شعبه',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 10 }, { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
      { wch: 14 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'اقلام');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="basharaf-items-template.xlsx"',
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
