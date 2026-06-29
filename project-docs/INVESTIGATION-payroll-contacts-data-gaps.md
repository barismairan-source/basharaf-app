# بررسی سه مشکل داده/منطقی — حقوق و طرف‌حساب‌ها

تاریخ: ۱۴۰۵-۰۴-۰۸ | وضعیت: READ-ONLY — هیچ کدی تغییر نکرده | منتظر تأیید برای پیاده‌سازی

---

## مشکل ۱ — کارمندان در صفحه پرسنل صفر هستند ولی در حقوق رکورد دارند / محاسبه مجدد fail می‌شود

### علت دقیق

کارمندان در این سیستم **soft-delete** می‌شوند، نه حذف فیزیکی:

```ts
// DELETE /api/employees/[id]/route.ts
await db.update(schema.employees)
  .set({ isActive: false })
  .where(eq(schema.employees.id, params.id));
```

**صفحه پرسنل** از `GET /api/employees` استفاده می‌کند که فیلتر دارد:
```ts
WHERE isActive = true
```
→ کارمند soft-delete شده از لیست ناپدید می‌شود.

**فیش‌های حقوق (`payslips`)** یک FK به `employees.id` دارند. چون Drizzle این FK را با `onDelete: 'restrict'` یا بدون cascading تعریف کرده، حذف فیزیکی کارمندی که فیش دارد اصلاً ممکن نیست — پس فیش‌ها سالم مانده‌اند.

**دوره‌های حقوق** از این فیش‌ها می‌خوانند → کارمند قدیمی در حقوق نشان داده می‌شود.

**محاسبه مجدد (`POST /api/payroll/runs/[id]/calculate`)** مجدداً کارمندان **فعال** را جستجو می‌کند:
```ts
// calculate/route.ts, خطوط ۶۵-۶۸
const empWhere = run.branchId
  ? and(eq(schema.employees.isActive, true), eq(schema.employees.branchId, run.branchId))
  : eq(schema.employees.isActive, true);
const emps = await db.select().from(schema.employees).where(empWhere);
if (emps.length === 0) throw new ApiError(400, 'هیچ پرسنل فعالی برای این اجرا نیست', 'NO_EMPLOYEES');
```

اگر همه کارمندان آن شعبه soft-delete شده باشند → `NO_EMPLOYEES` خطا.

### خلاصه مسیر خطا

```
کاربر کارمند را حذف می‌کند
  → isActive = false
  → GET /api/employees دیگر نشان نمی‌دهد (صفحه پرسنل خالی)
  → فیش‌های قدیمی سالم‌اند (در صفحه حقوق نشان می‌دهند)
  → دکمه «محاسبه مجدد» → empList خالی → خطای NO_EMPLOYEES
```

### راه‌حل پیشنهادی

**گزینه الف (آسان — UI):** دکمه «محاسبه مجدد» را برای دوره‌هایی که حداقل یک کارمند غیرفعال دارند disable کن و tooltip توضیح بده.

**گزینه ب (کامل‌تر — منطق):** route محاسبه را تغییر بده تا به‌جای re-query کارمندان فعال، از کارمندان موجود در `payslips` همان دوره استفاده کند — یعنی فقط دستمزدها را بر اساس فیش‌های موجود بازمحاسبی کند.

**توصیه:** گزینه ب صحیح‌تر است چون semantically محاسبه مجدد باید همان افراد را بازمحاسبی کند نه یک لیست جدید.

---

## مشکل ۲ — «برگشت ثبت» fail می‌شود روی دوره‌ای که تراکنش واقعی حسابداری ندارد

### علت دقیق

`reversePayrollPost` در `lib/payroll/postToBasharaf.ts` این منطق را دارد:

```ts
const [voucher] = await dbTx.select().from(schema.journalVouchers)
  .where(
    and(
      eq(schema.journalVouchers.idempotencyKey, `payroll_run:${runId}`),
      eq(schema.journalVouchers.status, 'posted'),
    )
  ).limit(1);

if (!voucher || voucher.status !== 'posted')
  throw new Error('سند posted برای این اجرا پیدا نشد');
```

اگر در جدول `journalVouchers` هیچ رکوردی با `idempotencyKey = 'payroll_run:{id}'` و `status = 'posted'` نباشد → خطا throw می‌شود.

**چه وقت این حالت رخ می‌دهد؟**

دو سناریو محتمل:
1. دوره‌ای که با کد **قدیمی** (قبل از پیاده‌سازی journal_voucher) به `posted` رسیده — رکورد journalVouchers اصلاً ساخته نشده
2. دوره‌ای که فرآیند post **نیمه‌کاره** قطع شد — `payrollRuns.status` به 'posted' رفت ولی `journalVouchers` insert نشد

**حالت سوم (کمتر محتمل):**
`journalVouchers` موجود است ولی `basharafVoucherId` به تراکنشی اشاره می‌کند که حذف شده یا هرگز commit نشده. در این حالت:
```ts
const coreTx = await dbTx.select().from(schema.transactions)
  .where(eq(schema.transactions.id, voucher.basharafVoucherId!)).limit(1);
// اگر coreTx.status !== 'approved' یا coreTx.accountId = null:
if (coreTx && coreTx.status === 'approved' && coreTx.accountId) {
  // ... برگرداندن balance
}
// غیر اینجا: بدون برگرداندن balance، status را به approved می‌گذارد
```
→ مانده حساب بدون برگشت، `payrollRuns.status` به `approved` می‌رود = **drift دائمی**.

**چرا کاربر فقط «خطای کلی» می‌بیند؟**
`handleErrorLogged` در `/api/payroll/runs/[id]/reverse/route.ts` یک پیام عمومی برمی‌گرداند — پیام اصلی («سند posted پیدا نشد») به کاربر نمی‌رسد.

### راه‌حل پیشنهادی

**گام ۱ — پیام خطای واضح:** وقتی journal_voucher پیدا نشد، API باید دقیقاً بگوید چه اتفاقی افتاده.

**گام ۲ — force-reset endpoint:** یک اکشن جدید بساز: «بازگشت اجباری به approved» که فقط `payrollRuns.status` را عوض می‌کند (بدون هیچ اثر مالی) — مناسب برای دوره‌هایی که اصلاً تراکنش حسابداری ندارند. این باید:
- فقط برای SuperAdmin در دسترس باشد
- confirm dialog با هشدار «این دوره سند مالی ندارد — مانده حساب تغییر نمی‌کند» داشته باشد
- در ژورنال ثبت شود

**گام ۳ — audit check:** در `reversePayrollPost` چک کن اگر `coreTx` وجود دارد ولی status آن `approved` نیست، خطا بده به‌جای silent skip.

---

## مشکل ۳ — مانده طرف‌حساب‌ها صفر نشان می‌دهد / کارت‌های «طلب ما» و «بدهی ما» صفر هستند

### علت دقیق

balance طرف‌حساب‌ها در `GET /api/contacts` فقط از تراکنش‌هایی محاسبه می‌شود که **`isCredit = true`** دارند:

```ts
// contacts/route.ts
.where(
  and(
    eq(schema.transactions.status, 'approved'),
    eq(schema.transactions.isCredit, true),   // ← فقط تراکنش نسیه!
  )
)
```

**`isCredit` چیست؟** این فیلد «نسیه بودن» تراکنش را نشان می‌دهد — یعنی اینکه پول هنوز رد و بدل نشده و بدهی/طلب ایجاد شده. تراکنش‌های نقدی (که contactId دارند ولی isCredit = false) در محاسبه مانده **نمی‌آیند**.

**چرا مانده صفر است؟**
اگر تراکنش‌های ثبت‌شده برای یک طرف‌حساب همگی `isCredit = false` باشند (یعنی نقدی پرداخت/دریافت شده)، مانده همیشه صفر خواهد بود.

**چرا «تسویه» نشان می‌دهد؟**
```tsx
// contacts/page.tsx
if (c.balance === 0) return <span className="text-[11px] text-muted">تسویه</span>;
```
این کد صحیح است — اگر balance صفر باشد «تسویه» نشان می‌دهد. **ولی** معنی واقعی ممکن است «تراکنش نسیه‌ای برای این طرف‌حساب ثبت نشده» باشد، نه اینکه واقعاً حساب تسویه شده.

**کارت‌های خلاصه:**
```tsx
const totalReceivable = contacts.filter(c => c.balance > 0).reduce((s, c) => s + c.balance, 0);
const totalPayable    = contacts.filter(c => c.balance < 0).reduce((s, c) => s + Math.abs(c.balance), 0);
```
وقتی همه balance=0 هستند، این‌ها صفر می‌شوند — این کد اشتباه نیست، **داده** مشکل دارد.

### ریشه اصلی مشکل

در پنل ثبت تراکنش، فیلد `isCredit` احتمالاً نه‌پیش‌فرض یا اشتباه تنظیم می‌شود. باید بررسی کرد:
1. وقتی کاربر یک فاکتور نسیه برای طرف‌حساب صادر می‌کند، آیا `isCredit = true` در DB ذخیره می‌شود؟
2. آیا API ثبت تراکنش این فیلد را از UI می‌گیرد یا hardcode است؟

### راه‌حل پیشنهادی

**گام ۱ (تشخیص):** در DB چند تراکنش با `contactId IS NOT NULL` را بررسی کن — اگر همه `isCredit = false` دارند، مشکل در فرم ثبت است نه نمایش.

**گام ۲ (اگر فرم مشکل دارد):** فیلد `isCredit` را در API ثبت تراکنش بررسی و fix کن.

**گام ۳ (UI بهتر):** به‌جای فقط «تسویه»، وقتی هیچ تراکنش نسیه‌ای نیست بنویس «بدون نسیه» تا کاربر بفهمد مشکل data entry است.

---

## نیاز جدید — گزارش تفکیک پرداختی/دریافتی به ازای هر طرف‌حساب

### وضعیت فعلی

`ContactLedgerDrawer` موجود است و تراکنش‌های نسیه را برای هر طرف‌حساب نشان می‌دهد. هر entry دارای فیلد `type` است:
- `'income'` = ArrowUpRight = دریافتی (دیگران به ما پرداخت کردند)
- `'expense'` = ArrowDownLeft = پرداختی (ما به دیگران پرداخت کردیم)

**API موجود** (`getContactLedger` در `lib/db/contactLedger.ts`) همه این داده‌ها را برمی‌گرداند. **هیچ API جدیدی لازم نیست.**

### راه‌حل پیشنهادی (دو گزینه)

**گزینه الف — ساده (توصیه‌شده):**
در بالای `ContactLedgerDrawer`، قبل از لیست تراکنش‌ها، دو row خلاصه اضافه کن:
- جمع کل دریافتی‌ها (income entries)
- جمع کل پرداختی‌ها (expense entries)
- مانده خالص (balance)

فقط محاسبه client-side از داده‌های موجود. هیچ endpoint جدیدی لازم نیست.

**گزینه ب — کامل (صفحه گزارش جداگانه):**
یک tab یا صفحه `reports/contact-ledger` بساز که:
- انتخاب طرف‌حساب (dropdown)
- فیلتر بازه تاریخ (from/to)
- جدول تراکنش‌ها با جمع‌ها

برای این گزینه باید `GET /api/contacts/[id]/ledger` پارامتر `from`/`to` بگیرد.

**توصیه:** گزینه الف را اول پیاده کن (کم‌هزینه، بیشترین ارزش فوری). گزینه ب را بعداً اگر نیاز بود.

---

## خلاصه اولویت‌بندی پیشنهادی

| # | مشکل | اثر | راه‌حل پیشنهادی | هزینه |
|---|------|-----|-----------------|-------|
| ۱ | محاسبه مجدد fail | کارکردی — محاسبه حقوق کار نمی‌کند | گزینه ب (از payslips موجود محاسبه کند) | متوسط |
| ۲ | برگشت ثبت fail | کارکردی — دوره‌های قدیمی قابل برگشت نیستند | پیام واضح + force-reset endpoint | متوسط |
| ۳ | مانده طرف‌حساب صفر | داده — اگر isCredit اشتباه است، کل ماژول بی‌استفاده | اول DB بررسی کن، بعد تصمیم | کم یا زیاد |
| ۴ | گزارش تفکیک | نیاز جدید — اطلاعات بیشتر | گزینه الف (خلاصه در drawer) | کم |

---

*این گزارش read-only است. قبل از هر پیاده‌سازی، تأیید کاربر لازم است.*
