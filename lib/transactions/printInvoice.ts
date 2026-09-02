import { fmt } from '@/lib/utils';
import type { Transaction, Branch, Contact } from '@/types';

/**
 * ساخت HTML یک فاکتور چاپی برای یک تراکنش — الگوی window.open+document.write
 * مطابق app/(app)/inventory/recipes/page.tsx (handlePrint).
 *
 * فقط یک ردیف کلی (عنوان/مبلغ) نشان می‌دهد — نه ردیف‌به‌ردیف کالا، چون
 * فقط تراکنش‌های فروش از طریق منوی دیجیتال saleMeta.lines دارند (که فعلاً
 * روی کلاینت هم serialize نمی‌شود) و قیمت لحظه‌ی فروش هم در آن ذخیره
 * نمی‌شود — نمایش ردیف‌به‌ردیف نیازمند فاز جدا برای دقت مالی است.
 */

const STATUS_LABEL: Record<string, string> = {
  pending: 'در انتظار تأیید',
  approved: 'تأییدشده',
  rejected: 'رد‌شده',
  proforma: 'پیش‌فاکتور',
};

/** جلوگیری از تزریق HTML — مقادیر آزاد کاربر (عنوان، طرف معامله، یادداشت، ...) قبل از قرارگیری در سند escape می‌شوند. */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildInvoiceHtml(
  tx: Transaction,
  branch: Pick<Branch, 'name' | 'address' | 'manager'> | undefined,
  contact: Pick<Contact, 'name'> | null,
): string {
  const isProforma = tx.status === 'proforma';
  const netAmount = tx.amount - (tx.vatAmount ?? 0);
  const partyName = contact?.name ?? tx.payee;

  const rows = `<tr>
    <td>1</td>
    <td>${escapeHtml(tx.title)}${tx.note ? `<div class="sub">${escapeHtml(tx.note)}</div>` : ''}</td>
    <td>${escapeHtml(tx.categoryName)}</td>
    <td>${fmt(netAmount)}</td>
  </tr>`;

  return `<!DOCTYPE html><html dir="rtl" lang="fa"><head>
<meta charset="UTF-8"><title>${isProforma ? 'پیش‌فاکتور' : 'فاکتور'} — ${escapeHtml(tx.title)}</title>
<style>
  body{font-family:Tahoma,Arial,sans-serif;padding:2cm;direction:rtl;font-size:12pt;color:#111}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #333;padding-bottom:.4cm;margin-bottom:.6cm}
  .head h1{font-size:18pt;margin:0}
  .head .branch{color:#555;font-size:10pt;margin-top:.2cm;line-height:1.6}
  .head .badge{font-size:10pt;border:1px solid #999;border-radius:4px;padding:3px 10px}
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:.3cm .8cm;font-size:10.5pt;margin-bottom:.8cm;color:#333}
  .meta b{color:#111}
  table{width:100%;border-collapse:collapse;font-size:11pt}
  th{background:#eee;padding:8px 10px;text-align:right;border:1px solid #bbb;font-weight:bold}
  td{padding:8px 10px;border:1px solid #ddd;vertical-align:top}
  td:first-child,th:first-child{text-align:center;width:2em}
  .sub{color:#888;font-size:9pt;margin-top:2px}
  .totals{margin-top:.6cm;width:40%;margin-inline-start:auto;font-size:11pt}
  .totals div{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #eee}
  .totals .grand{font-weight:bold;font-size:13pt;border-bottom:2px solid #333;border-top:1px solid #333}
  .footer{margin-top:1.2cm;font-size:9pt;color:#999;border-top:1px solid #eee;padding-top:.3cm;text-align:center}
  @media print{@page{margin:1.5cm}}
</style></head><body>
<div class="head">
  <div>
    <h1>${isProforma ? 'پیش‌فاکتور' : 'فاکتور'}</h1>
    <div class="branch">
      با شرف${branch ? ` — ${escapeHtml(branch.name)}` : ''}<br>
      ${branch?.address ? escapeHtml(branch.address) : ''}
    </div>
  </div>
  <div class="badge">${STATUS_LABEL[tx.status] ?? tx.status}</div>
</div>
<div class="meta">
  <div><b>تاریخ:</b> ${escapeHtml(tx.date)}</div>
  <div><b>شماره فاکتور:</b> ${tx.invoiceCode ? escapeHtml(tx.invoiceCode) : '—'}</div>
  <div><b>طرف‌حساب:</b> ${escapeHtml(partyName || '—')}</div>
  <div><b>روش پرداخت:</b> ${escapeHtml(tx.method || '—')}</div>
</div>
<table>
  <tr><th>#</th><th>شرح</th><th>دسته</th><th>مبلغ (تومان)</th></tr>
  ${rows}
</table>
<div class="totals">
  <div><span>جمع</span><span>${fmt(netAmount)}</span></div>
  ${(tx.vatAmount ?? 0) > 0 ? `<div><span>مالیات ارزش‌افزوده</span><span>${fmt(tx.vatAmount!)}</span></div>` : ''}
  <div class="grand"><span>مبلغ نهایی</span><span>${fmt(tx.amount)} تومان</span></div>
</div>
<div class="footer">این سند رایانه‌ای است و بدون مهر/امضا معتبر است · تولیدشده از سامانه با شرف</div>
<script>setTimeout(()=>{window.print();},250)</script>
</body></html>`;
}

/** باز کردن پنجره‌ی چاپ برای یک تراکنش. */
export function printInvoice(
  tx: Transaction,
  branch: Pick<Branch, 'name' | 'address' | 'manager'> | undefined,
  contact: Pick<Contact, 'name'> | null,
): void {
  const html = buildInvoiceHtml(tx, branch, contact);
  const w = window.open('', '_blank', 'width=750,height=900');
  if (w) { w.document.write(html); w.document.close(); }
}
