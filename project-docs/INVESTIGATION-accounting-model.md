# INVESTIGATION — مدل حسابداری: تشخیص و طراحی اصلاح

> تاریخ بررسی: ۱۴۰۴-۰۴-۲۰ (2026-07-11) — وضعیت: **طراحی، بدون تغییر کد**
>
> این سند فقط طراحی است. هیچ چیزی تغییر نکرده. قبل از هر اقدامی تأیید کاربر لازم است.

---

## ۱. مدل فعلی — دقیق از schema و کد

### جدول `accounts` (صندوق‌ها و حساب‌ها)

```
id          uuid PK
name        text NOT NULL
type        text default='cash'   ← رشته آزاد: 'cash' | 'bank' | 'pos'
balance     bigint default=0      ← CACHE — از تراکنش‌های approved محاسبه می‌شود
isActive    boolean default=true
branchId    uuid FK→branches (nullable)
createdAt, updatedAt
```

**مهم:** `type` یک enum نیست — فقط یک `text` است. API validation آن را `z.enum(['cash','bank','pos'])` می‌کند (در `app/api/accounts/route.ts` و `[id]/route.ts`).

**چطور balance آپدیت می‌شود:**
`lib/db/balanceHelpers.ts` → `applyBalance` / `reverseBalance`:
- `income`: `balance += amount` روی `accountId`
- `expense`: `balance -= amount` روی `accountId`
- `transfer`: `balance -= amount` روی `accountId` + `balance += amount` روی `destinationAccountId`
- فقط هنگام approve/reject/delete تراکنش فراخوانی می‌شود (atomic درون `db.transaction`)

**`/api/accounts/recalculate` (POST):**
برای **همه** accounts، از صفر بازسازی می‌کند:
`balance = Σ(income) - Σ(expense) - Σ(transfer_out) + Σ(transfer_in)` — فقط approved

**UI totalBalance** در `app/(app)/accounts/page.tsx`:
```ts
const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
```
شامل **همه** accounts فعال، بدون تفکیک نوع.

---

### جدول `contacts` (طرف‌حساب‌ها)

```
id          uuid PK
name        text NOT NULL
type        text default='customer'   ← free text: 'customer'|'supplier'|'other'|هر چیز دیگر
phone       text (nullable)
note        text (nullable)
balance     bigint default=0          ← CACHE — مثبت=او بدهکار، منفی=ما بدهکار
isActive    boolean
createdAt, updatedAt
```

**چطور balance آپدیت می‌شود:**
`applyContactBalance` فقط برای تراکنش‌هایی که `isCredit=true` دارند:
- `income + isCredit`: مشتری بدهکار می‌شود → `balance += amount`
- `expense + isCredit`: ما بدهکار می‌شویم → `balance -= amount`
- تراکنش‌های معمول (isCredit=false): هیچ اثری روی contacts ندارد

---

### جدول `transactions` (تراکنش‌ها) — فیلدهای مرتبط

```
accountId             uuid FK→accounts (nullable, onDelete: set null)
destinationAccountId  uuid FK→accounts (nullable)   ← فقط transfer
contactId             uuid FK→contacts (nullable, onDelete: set null)
isCredit              boolean default=false          ← نسیه
type                  enum('income','expense','transfer')
status                enum('pending','approved','rejected','proforma')
amount                bigint
```

---

### داشبورد KPI "موجودی" — از **کجا** می‌آید

`useDashboardMetrics` (hook) روی `store.transactions` محاسبه می‌کند:
```ts
balance = Σ(approved.income) - Σ(approved.expense)
```
این **ربطی به `accounts.balance` ندارد** — مستقیماً از تراکنش‌ها محاسبه می‌شود.

KPI های صفحه accounts (متریک‌کارت‌ها) از `accounts[i].balance` می‌خوانند.

---

### ریشه‌ی مشکل

شرکا (حسین شرف، شهریار شرف) به‌عنوان `account` با `type='cash'` ثبت شده‌اند.
- آورده‌ی سرمایه‌ای وجود ندارد — آن‌ها «صندوق نقدی» هستند با موجودی اولیه صفر
- تراکنش‌های pre-opening (۵۱ تراکنش) به‌عنوان `expense` از این صندوق‌ها خرج شده‌اند
- نتیجه: `balance` این صندوق‌ها = −۸ میلیارد تومان
- `totalBalance` در UI = جمع همه accounts از جمله این دو = عدد بسیار منفی
- **مشکل مفهومی**: این −۸ میلیارد سرمایه‌ای است که شرکا گذاشته‌اند، نه «بدهی» شرکت

---

## ۲. مدل پیشنهادی — مقایسه دو گزینه

### گزینه الف — نوع جدید `partner_equity` روی `accounts` (پیشنهاد)

**تغییرات لازم:**

| لایه | تغییر |
|---|---|
| Schema | بدون تغییر (type هم‌اکنون text است) |
| API validation | اضافه کردن `'partner_equity'` به `z.enum` در `route.ts` و `[id]/route.ts` |
| `accounts/page.tsx` | `totalBalance` فقط `type !== 'partner_equity'` |
| `dashboard/page.tsx` | `accounts.slice(0,4)` باید partner_equity را exclude کند |
| `transactions/new/page.tsx` | در select صندوق: `accounts.filter(a => a.type !== 'partner_equity')` — شرکا نباید صندوق عملیاتی باشند |
| گزارش جدید | یک بخش جدا «آورده/برداشت شرکا» که balance این accounts را نشان می‌دهد |

**مزایا:**
- کمترین تغییر schema — هیچ migration جدول لازم نیست
- ۵۱ تراکنش موجود دست‌نخورده می‌مانند (`accountId` تغییر نمی‌کند)
- recalculate API بدون تغییر — balance درست محاسبه می‌شود (فقط UI تفکیک می‌کند)
- آیکن و نوع جدید در UI قابل نمایش است

**معایب:**
- `accounts` هنوز برای دو هدف مختلف استفاده می‌شود (ذهنی — نه فنی)
- اگر بعداً جزئیات بیشتر برای equity لازم شد (تاریخ آورده، سند، درصد مشارکت)، باید فیلد اضافه کرد

---

### گزینه ب — جدول جدید `partner_equity_accounts`

**جدول جدید:**
```sql
CREATE TABLE partner_equity_accounts (
  id       uuid PK,
  name     text NOT NULL,
  balance  bigint default=0,
  ...
);
```

**مشکل اصلی:** ۵۱ تراکنش در `transactions.accountId` به `accounts.id` لینک دارند.
برای جداسازی واقعی باید:
1. فیلد `partnerAccountId` به `transactions` اضافه شود (یا `accountId` بماند)
2. ۵۱ تراکنش migrate شوند به جدول جدید
3. `balanceHelpers` برای جدول جدید بازنویسی شود

**نتیجه:** پیچیدگی بسیار بالا، ریسک داده‌ای زیاد — برای مشکلی که با گزینه الف کاملاً حل می‌شود.

**→ پیشنهاد: گزینه الف** — ساده‌ترین، ایمن‌ترین، و با منطق فعلی سازگار.

---

## ۳. نقشه مهاجرت داده — طراحی (اجرا منتظر تأیید)

### مرحله صفر: بررسی وضعیت فعلی (SQL فقط خواندنی)

```sql
-- بررسی accounts شرکا
SELECT id, name, type, balance
FROM accounts
WHERE name ILIKE '%شرف%' OR name ILIKE '%حسین%' OR name ILIKE '%شهریار%';

-- تعداد تراکنش‌های متصل به هر account
SELECT a.name, a.type, a.balance,
       COUNT(t.id) AS tx_count,
       SUM(CASE WHEN t.type='income' THEN t.amount ELSE 0 END) AS total_income,
       SUM(CASE WHEN t.type='expense' THEN t.amount ELSE 0 END) AS total_expense
FROM accounts a
LEFT JOIN transactions t ON t.account_id = a.id AND t.status = 'approved'
WHERE a.name ILIKE '%شرف%'
GROUP BY a.id, a.name, a.type, a.balance;
```

### مرحله یک: migration ایمن

**فایل:** `db-partner-equity-migration.sql`

```sql
-- db-partner-equity-migration.sql
-- تبدیل صندوق شرکا به نوع partner_equity
-- اجرا فقط پس از تأیید کاربر. همه عملیات idempotent هستند.

-- ===== ۱. بررسی قبل از اجرا =====
-- این query را اول اجرا کنید تا مطمئن شوید شناسه‌ها درست است:
-- SELECT id, name, type, balance FROM accounts WHERE name ILIKE '%شرف%';

-- ===== ۲. تغییر type (بر اساس نام — اگر شناسه UUID دارید جایگزین کنید) =====
UPDATE accounts
SET type = 'partner_equity', updated_at = NOW()
WHERE name IN (
  'صندوق حسین شرف',
  'صندوق شهریار شرف'
)
AND type = 'cash';  -- فقط اگر هنوز cash باشند (idempotent)

-- ===== ۳. بررسی بعد از اجرا =====
-- SELECT id, name, type, balance FROM accounts WHERE type = 'partner_equity';
-- انتظار: ۲ ردیف با balance منفی (این درست است — نشان‌دهنده هزینه از سرمایه شریک)
```

**نکات امنیتی:**
- هیچ تراکنشی جابجا نمی‌شود، حذف نمی‌شود، یا آپدیت نمی‌شود
- `accountId` در transactions دست‌نخورده باقی می‌ماند
- balance این دو account تغییر نمی‌کند — فقط برچسب `type` عوض می‌شود
- پس از migration، `totalBalance` در UI این دو را exclude می‌کند → موجودی کل «عملیاتی» نمایش داده می‌شود
- گزارش equity جدید balance این دو را به‌عنوان «برداشت از سرمایه» نشان می‌دهد (عدد منفی = شرکا هزینه پرداخته‌اند)

**آنچه تغییر می‌کند (فقط در UI):**
| صفحه | قبل | بعد |
|---|---|---|
| صندوق‌ها — جمع کل | شامل −۸ میلیارد شرکا | فقط صندوق‌های عملیاتی |
| داشبورد — کارت‌های حساب | صندوق شرکا نشان داده می‌شود | پنهان یا در بخش جداگانه |
| فرم ثبت تراکنش | صندوق شرکا در لیست | از لیست حذف می‌شود |
| گزارش جدید | وجود ندارد | «آورده/برداشت شرکا» |

---

## ۴. پاک‌سازی طرف‌حساب‌ها

### وضعیت فعلی contacts

جدول `contacts` هر موجودیت با نام و `type` دارد. `type` فیلد آزاد است — UI با `datalist` پیشنهاد می‌دهد: `customer`, `supplier`, `other`.

**مشکل:** موجودیت‌هایی که اسمشان نشان‌دهنده **دسته هزینه** هستند نه طرف‌حساب واقعی (مثل «مخارج»، «حقوق»). این‌ها نه تلفن دارند، نه نسیه‌ای — صرفاً برای پر کردن فیلد `contactId` در تراکنش ثبت شده‌اند.

### Query پیشنهادی برای بررسی

```sql
-- این query را در pgAdmin اجرا کنید تا لیست واقعی contacts و تراکنش‌هایشان را ببینید:
SELECT
  c.id,
  c.name,
  c.type,
  c.phone,
  c.balance,
  COUNT(t.id) AS linked_tx_count,
  MAX(t.created_at) AS last_tx_date
FROM contacts c
LEFT JOIN transactions t ON t.contact_id = c.id
GROUP BY c.id, c.name, c.type, c.phone, c.balance
ORDER BY linked_tx_count DESC, c.name;
```

### چارچوب تصمیم‌گیری

| وضعیت | پیشنهاد |
|---|---|
| contact با `linked_tx_count = 0` و balance = 0 | **حذف ایمن** — هیچ اثری ندارد |
| contact با `linked_tx_count > 0` و بدون نسیه (balance = 0) | بررسی کنید آیا categoryName تراکنش‌ها همان معنا را دارد — اگر بله می‌توان `contactId` را NULL کرد و contact را حذف کرد |
| contact با `balance != 0` | **دست نزنید** — مانده نسیه دارد، نیاز به تسویه اول |
| contact با نام دسته‌مانند («مخارج»، «حقوق») و `linked_tx_count > 0` | **تصمیم کاربر** — لیست ارائه شود |

### پیشنهاد اجرا

مهاجرت خودکار **امن نیست** چون نمی‌دانیم کاربر این تراکنش‌ها را «برای گزارش» با contact لینک کرده یا از سر عادت.

**بهترین رویکرد:** یک صفحه مدیریتی «پاکسازی طرف‌حساب» که لیست query بالا را نمایش دهد و کاربر هر ردیف را دستی تایید کند. این در یک فاز جداگانه پیاده می‌شود.

---

## ۵. ساده‌سازی فرم ثبت تراکنش

### وضعیت فعلی

فرم `app/(app)/transactions/new/page.tsx` این فیلدها را **همزمان** نشان می‌دهد:
1. نوع تراکنش (toggle)
2. عنوان
3. مبلغ
4. دسته‌بندی
5. شعبه
6. صندوق / حساب (+ صندوق مقصد برای transfer)
7. روش پرداخت
8. VAT (checkbox + details)
9. طرف‌حساب (select)
10. نسیه (checkbox)
11. شماره رسید
12. تاریخ
13. کد فاکتور/پیش‌فاکتور
14. پیش‌فاکتور (فقط admin)
15. توضیحات

**۱۵ فیلد در یک نمای واحد** — برای مدیر مالی که ۱۰ تراکنش روزانه ثبت می‌کند این بار شناختی بالاست.

### طراحی دومرحله‌ای پیشنهادی

**حالت ساده (پیش‌فرض — ۵ فیلد):**
```
┌─────────────────────────────────────────┐
│ نوع: [هزینه] [درآمد] [انتقال]           │
│ عنوان:  [___________________________]   │
│ مبلغ:   [_____________] تومان           │
│ دسته:   [── انتخاب دسته ──]            │
│ صندوق:  [── انتخاب صندوق ──]           │
│                                         │
│          [+ جزئیات بیشتر]              │
│                                         │
│  [انصراف]        [ثبت تراکنش]          │
└─────────────────────────────────────────┘
```

**پیش‌فرض‌های هوشمند در حالت ساده:**
- شعبه: شعبه‌ی کاربر (برای BranchUser) یا اولین شعبه
- تاریخ: امروز
- روش پرداخت: «نقد»
- شماره رسید: خالی
- VAT: خاموش
- isCredit: false

**Accordion «جزئیات بیشتر» — وقتی باز می‌شود:**
- شعبه (اگر SuperAdmin)
- روش پرداخت
- طرف‌حساب + نسیه
- شماره رسید
- تاریخ (با مقدار پیش‌فرض امروز)
- کد فاکتور/پیش‌فاکتور
- VAT
- پیش‌فاکتور (فقط admin)
- توضیحات

**حالت بدون از دست دادن قابلیت:**
- همه فیلدها موجودند — فقط پشت یک accordion
- وقتی کاربر accordion را باز کرد، برای مدت session باز می‌ماند (`localStorage` ساده)
- اگر از URL پارامترهای pre-fill بیاید (مثل فرم چک‌ها)، accordion خودکار باز می‌شود

**چه چیزی تغییر نمی‌کند:**
- همه validation‌ها یکسان هستند
- همه API calls یکسان هستند
- schema فرم تغییر نمی‌کند
- فقط ترتیب نمایش تغییر می‌کند

---

## ۶. یکپارچگی بصری — دکمه‌های primary

### وضعیت فعلی

`Button` component در `components/ui/Button.tsx` یک سیستم یکپارچه دارد:
- `variant="primary"` → `bg-accent border-accent text-white hover:bg-[var(--accent-hover)]`
- `variant="default"` → `bg-surface border-border text-text hover:bg-bg`
- `size="sm" | "md" | "lg"` → `h-8 | h-11 | h-12`

**Inconsistency فعلی (فهرست موارد):**

| صفحه/مکان | مشکل |
|---|---|
| `transactions/new/page.tsx:393` | دکمه «انصراف» با custom HTML: `<button className="h-10 px-4 text-[13px]...">` به‌جای `<Button variant="default">` |
| `transactions/new/page.tsx:401` | دکمه Submit با `<Button>` اما `size` مشخص نشده → default=md (h-11) ولی انصراف h-10 → عدم تطابق ارتفاع |
| `contacts/page.tsx:106,113` | فیلدهای edit inline از `<input>` مستقیم (بدون `Field`/`Input` component) |
| `contacts/page.tsx:282,289` | فیلد «نوع» در فرم افزودن از `<input list="...">` به‌جای `<Select>` یا `<Input>` |
| `accounts/[id]/page.tsx` | باید بررسی شود |
| بعضی صفحات | `<button>` با className مستقل به‌جای `<Button variant="ghost">` |

**استاندارد پیشنهادی:**

```
دکمه اقدام اصلی صفحه:
  <Button variant="primary" size="sm" icon={Plus}>...</Button>

دکمه ثانویه / انصراف:
  <Button variant="default" size="sm">...</Button>

دکمه مخرب:
  <Button variant="destructive" size="sm" icon={Trash2}>...</Button>

دکمه icon-only (تبدیل حالت edit):
  <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-stone-50 text-muted">
  (قابل قبول — چون سایز مستقل از Button لازم است)
```

**اصل:** هر دکمه‌ای که کنار یک `<Button>` نشسته، باید از همان component باشد تا ارتفاع‌ها یکسان شود.

---

## فازبندی اجرا (پیشنهادی)

### فاز A — داده‌ای: شریک equity (کم‌ریسک، ۱ commit)
1. Migration SQL آماده شود (`db-partner-equity-migration.sql`)
2. کاربر آن را در pgAdmin تأیید و اجرا کند
3. کد: API validation (اضافه `'partner_equity'`)، UI فیلتر `totalBalance`، فرم تراکنش صندوق شرکا را hide کند
4. dashboard: کارت‌های account partner_equity را در بخش «آورده شرکا» جداگانه نشان دهد

**→ نیاز به تأیید مقدم کاربر روی اسامی دقیق accounts در DB**

### فاز B — UI: ساده‌سازی فرم تراکنش (متوسط، ۱ commit)
accordion «جزئیات بیشتر» در فرم ثبت تراکنش — هیچ تغییر API/schema لازم نیست.

### فاز C — داده‌ای: پاکسازی contacts (ریسک متوسط، نیاز به تأیید دستی کاربر)
اجرای query بررسی → ارائه لیست به کاربر → کاربر تصمیم می‌گیرد → کد migration.

### فاز D — UI: یکپارچگی دکمه‌ها (کم‌ریسک، pure refactor)
جایگزینی custom `<button>` با `<Button>` در جاهایی که با کامپوننت استاندارد کنار هم نشسته‌اند.

**توصیه ترتیب:** A → B → C → D
فاز A بیشترین اثر بصری فوری دارد. فاز C نیاز به بررسی داده دارد.

---

## نکات مهم برای جلسه‌ی بعد

- قبل از فاز A، **اسامی دقیق** صندوق‌های شرکا در DB باید تأیید شوند (با query بخش ۳)
- `accounts.balance` بعد از تغییر type نیازی به recalculate ندارد — منطق تغییر نمی‌کند
- فاز A تنها تأثیر را روی **نمایش** می‌گذارد — هیچ قابلیتی حذف نمی‌شود
- داشبورد KPI "موجودی" (از transactions) تغییر نمی‌کند — آن مستقل از accounts است
