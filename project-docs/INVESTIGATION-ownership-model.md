# INVESTIGATION — مدل مالکیت و تأمین مالی (ریشه‌ای)

> تاریخ: ۱۴۰۴-۰۴-۲۰ (2026-07-11) — وضعیت: **طراحی، هیچ کدی تغییر نکرده**
>
> این سند ادامه‌ی `INVESTIGATION-accounting-model.md` است.
> تصمیم کاربر: گزینه‌ی سطحی (فقط type=partner_equity) کافی نیست —
> مدل مالکیت باید ریشه‌ای و استاندارد طراحی شود.

---

## ۱. مدل داده

### ۱.۱ جدول `partners` — چرا نه `contacts` با type='partner'

**وضعیت فعلی `contacts`:**
- `balance` فیلد cache از تراکنش‌های `isCredit=true` است: مثبت = طرف‌حساب به ما بدهکار، منفی = ما بدهکاریم
- `contactLedger.ts` صراحتاً: _«مانده فقط از تراکنش‌های نسیه»_
- `type` فیلد آزاد (datalist)، نه enum

**چرا `contacts` برای شریک مناسب نیست:**

| معیار | contacts | partners جدید |
|---|---|---|
| معنای balance | نسیه (بدهکار/بستانکار) | آورده سرمایه (equity) |
| منطق balance | `isCredit=true` transactions | جمع تراکنش‌های accountId→equity_account |
| اتصال به شعبه | ندارد | از طریق `partner_branches` |
| فیلدهای آینده | شماره فاکتور، تاریخ رسید | تاریخ ورود، درصد سهم، روش تقسیم سود |
| گزارش لجر | بدهکاری/نسیه | آورده به تفکیک شعبه |
| داشبورد «شرکا» | `contacts.balance !== 0` (همه!) | فقط partners واقعی |

**نتیجه:** `contacts` از نظر معنایی برای equity کاملاً اشتباه است. جدول جدا `partners` لازم است.

---

### ۱.۲ جدول `partners`

```sql
CREATE TABLE partners (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     text        NOT NULL,
  phone         text,
  national_id   text,
  note          text,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
```

**Drizzle schema:**
```typescript
export const partners = pgTable('partners', {
  id:         uuid('id').primaryKey().defaultRandom(),
  fullName:   text('full_name').notNull(),
  phone:      text('phone'),
  nationalId: text('national_id'),
  note:       text('note'),
  isActive:   boolean('is_active').notNull().default(true),
  createdAt:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:  timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

---

### ۱.۳ جدول `partner_branches` — رابطه شریک↔شعبه

هر شریک می‌تواند در چند شعبه سرمایه داشته باشد. ترکیب شرکا از شعبه‌ای به شعبه دیگر فرق می‌کند.

```sql
CREATE TABLE partner_branches (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id      uuid        NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
  branch_id       uuid        NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  share_percent   numeric(5,2),          -- درصد سهم — اختیاری (بعداً)
  joined_date     text,                  -- تاریخ ورود شریک به این شعبه (جلالی)
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partner_id, branch_id)
);
```

**Drizzle schema:**
```typescript
export const partnerBranches = pgTable('partner_branches', {
  id:           uuid('id').primaryKey().defaultRandom(),
  partnerId:    uuid('partner_id').notNull().references(() => partners.id, { onDelete: 'restrict' }),
  branchId:     uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'restrict' }),
  sharePercent: numeric('share_percent', { precision: 5, scale: 2 }),
  joinedDate:   text('joined_date'),
  isActive:     boolean('is_active').notNull().default(true),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  partnerBranchUniq: uniqueIndex('partner_branches_unique').on(t.partnerId, t.branchId),
  partnerIdx: index('partner_branches_partner_idx').on(t.partnerId),
  branchIdx:  index('partner_branches_branch_idx').on(t.branchId),
}));
```

> **ملاحظه آینده:** `share_percent` برای «تقسیم سود» بعداً پر می‌شود. فعلاً nullable است.

---

### ۱.۴ حساب‌های equity — ستون `partner_id` روی `accounts`

**مسئله:** ۵۱ تراکنش pre-opening از طریق `accountId` به دو حساب فعلی لینک دارند. هر رویکردی که این FK را جابجا کند، migration پیچیده و پرریسک می‌شود.

**گزینه‌ها:**

| | گزینه الف: ستون `partner_id` روی `accounts` | گزینه ب: جدول جدید `partner_equity_accounts` |
|---|---|---|
| Migration | فقط `ADD COLUMN` + `UPDATE type` | باید FK در ۵۱ تراکنش جابجا شود |
| تراکنش‌ها | دست‌نخورده | باید `accountId` بازنویسی شود |
| `balanceHelpers` | بدون تغییر | باید برای جدول جدید بازنویسی شود |
| UI یکپارچگی | حداقل تغییر | دو سیستم موازی برای مدت migrate |
| ریسک | بسیار کم | بالا |

**→ گزینه الف انتخاب می‌شود.**

**تغییرات لازم روی `accounts`:**
```sql
-- ۱. ستون جدید (nullable — فقط partner_equity مقدار دارد)
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES partners(id) ON DELETE RESTRICT;

-- ایندکس
CREATE INDEX IF NOT EXISTS accounts_partner_id_idx ON accounts (partner_id)
  WHERE partner_id IS NOT NULL;
```

**جدول `accounts` پس از migration:**
```
id              uuid PK
name            text
type            text   ← 'cash' | 'bank' | 'pos' | 'partner_equity'
balance         bigint CACHE
partner_id      uuid nullable → partners.id   ← جدید
branch_id       uuid nullable → branches.id
is_active       boolean
```

**قرارداد:**
- `type='partner_equity'` → `partner_id` باید مقدار داشته باشد
- `type IN ('cash','bank','pos')` → `partner_id` باید NULL باشد
- `branch_id` روی equity account = شعبه‌ای که این آورده به آن تعلق دارد
- `branch_id=null` روی equity account = آورده ستادی (ببینید سؤالات باز — بخش ۶)

**تغییرات TypeScript:**
```typescript
// types/transaction.ts — Account type
export interface Account {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'pos' | 'partner_equity' | string;
  balance: number;
  isActive: boolean;
  branchId: string | null;
  partnerId: string | null;   // ← جدید
  createdAt: string;
  updatedAt: string;
}
```

---

### ۱.۵ scope حساب‌ها — ستادی vs شعبه (کجا گم می‌شود)

فعلاً `branchId=null` روی accounts «ستادی» را نشان می‌دهد اما UI این تفکیک را نمایش نمی‌دهد.

**کجاها مشکل وجود دارد:**

| صفحه / فایل | مشکل فعلی |
|---|---|
| `accounts/page.tsx:65` | `totalBalance = accounts.reduce(...)` — همه accounts بدون تفکیک |
| `accounts/page.tsx:254` | DataList بدون grouping — ستادی و شعبه‌ای قاطی |
| `transactions/new/page.tsx:261` | account select: همه accounts (همه شعب + ستادی) یکجا |
| `dashboard/page.tsx:189` | `accounts.slice(0,4)` — اولین ۴ account بدون تفکیک |
| `app/api/accounts/recalculate/route.ts:18` | `SELECT * FROM accounts` — شامل equity هم می‌شود |

**طرح اصلاح scope:**

```
صفحه accounts:
  ─── ستادی ───────────────────────────────────
    صندوق مرکزی          ۲،۵۰۰،۰۰۰   [نقدی]
  ─── شعبه A.S.P ──────────────────────────────
    صندوق روزانه          ۸۵۰،۰۰۰    [نقدی]
    پاسارگاد            ۱،۲۰۰،۰۰۰    [بانک]
    ─── آورده شرکا ────────────────────────────
    آورده: حسین شرف    −۶،۵۰۰،۰۰۰   [سرمایه]
    آورده: شهریار شرف  −۱،۵۰۰،۰۰۰   [سرمایه]
  ─── موجودی عملیاتی (جمع بدون equity) ───────
    ۴،۵۵۰،۰۰۰
```

---

## ۲. جریان ثبت پرداخت — انتخاب سلسله‌مراتبی منبع پول

### مشکل فعلی
فرم تراکنش یک select صاف از **همه** accounts دارد — بدون برچسب شعبه، بدون تفکیک equity/عملیاتی.

### طراحی جدید (ادغام‌شده با فرم دومرحله‌ای سند قبلی)

**حالت ساده — ۵ فیلد:**
```
┌──────────────────────────────────────────────────┐
│  نوع:  [هزینه] [درآمد] [انتقال]                  │
│                                                  │
│  عنوان: [_________________________________]      │
│                                                  │
│  مبلغ:  [_______________] تومان                  │
│                                                  │
│  دسته:  [── انتخاب دسته ──────────────── ▼]      │
│                                                  │
│  شعبه:  [A.S.P  ▼]  ← قفل برای BranchUser       │
│                                                  │
│  منبع پول:  [── انتخاب منبع ──────────── ▼]      │
│    ─── عملیاتی ──────────────────────────────    │
│    □ صندوق روزانه A.S.P (۸۵۰،۰۰۰)               │
│    □ پاسارگاد (۱،۲۰۰،۰۰۰)                       │
│    ─── آورده شرکا ───────────────────────────    │
│    □ آورده: حسین شرف (−۶.۵م)                    │
│    □ آورده: شهریار شرف (−۱.۵م)                  │
│                                                  │
│              [+ جزئیات بیشتر ▼]                 │
│                                                  │
│  [انصراف]              [ثبت تراکنش]              │
└──────────────────────────────────────────────────┘
```

**قوانین فیلتر:**
- وقتی شعبه = A.S.P انتخاب شده: نمایش accounts که `branchId = A.S.P` یا `branchId = null` (ستادی)
- وقتی «ستادی» انتخاب شده: فقط accounts با `branchId = null`
- حساب‌های `type='partner_equity'` جداگانه برچسب «آورده: [نام شریک]» می‌گیرند (با رنگ violet که از DashCard شرکا الهام گرفته)
- انتخاب حساب equity = «این هزینه از آورده‌ی این شریک رفت» — معنا صریح است

**منطق فیلتر (کد):**
```typescript
// در accounts که برای فرم نمایش داده می‌شوند:
const formAccounts = accounts.filter(a => 
  a.isActive && (a.branchId === selectedBranchId || a.branchId === null)
);

// گروه‌بندی:
const operational = formAccounts.filter(a => a.type !== 'partner_equity');
const equity      = formAccounts.filter(a => a.type === 'partner_equity');

// برچسب equity:
function equityLabel(account: Account): string {
  const partner = partners.find(p => p.id === account.partnerId);
  return `آورده: ${partner?.fullName ?? account.name}`;
}
```

**تغییر سمانتیک «بدون صندوق»:**
گزینه «— بدون صندوق (تأثیری بر موجودی ندارد) —» حفظ می‌شود — برای تراکنش‌هایی که فقط ثبت تاریخی هستند.

---

## ۳. گزارش‌ها

### ۳.۱ کارت «شرکا» در داشبورد (جایگزین نسخه فعلی)

فعلاً: همه contacts با balance != 0 نمایش داده می‌شوند (`/contacts` — ترکیبی از نسیه و...)
بعد از migration: از جدول `partners` + `accounts` با type='partner_equity' می‌خواند.

```
╔══════════════════════════════════════════════╗
║  شرکا                                 مشاهده ║
╠══════════════════════════════════════════════╣
║  حسین شرف                                    ║
║    A.S.P:  −۶،۵۰۰،۰۰۰،۰۰۰ تومان            ║
║    جمع:    −۶،۵۰۰،۰۰۰،۰۰۰ تومان            ║
╠──────────────────────────────────────────────╣
║  شهریار شرف                                  ║
║    A.S.P:  −۱،۵۰۰،۰۰۰،۰۰۰ تومان            ║
║    جمع:    −۱،۵۰۰،۰۰۰،۰۰۰ تومان            ║
╚══════════════════════════════════════════════╝
  (منفی = شریک آورده گذاشته / مثبت = شریک برداشت کرده)
```

> **توضیح برچسب:** عدد منفی روی equity account یعنی «این پول از جیب شریک رفت» — نه بدهی شرکت. این توضیح باید در UI واضح باشد (tooltip یا subtitle).

### ۳.۲ صفحه «شرکا» (مستقل از contacts)

```
/partners — صفحه مدیریت شرکا

[شریک جدید]

╔═══════════════════════════════════════════════════╗
║ حسین شرف          ۰۹۱۲-...                       ║
║ ─────────────────────────────────────────────     ║
║  A.S.P (از ۱۴۰۳/۰۸/۰۱):                         ║
║    آورده:    ۶،۵۰۰،۰۰۰،۰۰۰ تومان               ║
║    بازیافت:  ۰ تومان                             ║
║    خالص:    −۶،۵۰۰،۰۰۰،۰۰۰ تومان               ║
╚═══════════════════════════════════════════════════╝
```

### ۳.۳ موجودی کل — همه‌جا فقط عملیاتی

```typescript
// در همه‌جا این الگو:
const operationalBalance = accounts
  .filter(a => a.type !== 'partner_equity' && a.isActive)
  .reduce((s, a) => s + a.balance, 0);

// equity جداگانه:
const totalEquityIn = accounts
  .filter(a => a.type === 'partner_equity' && a.balance < 0 && a.isActive)
  .reduce((s, a) => s + Math.abs(a.balance), 0);
```

---

## ۴. نقشه مهاجرت از وضعیت فعلی

### وضعیت اولیه (قبل از migration)
- دو account با type='cash', balance منفی:
  - «صندوق حسین شرف» balance ≈ −۶،۵۰۰،۰۰۰،۰۰۰
  - «صندوق شهریار شرف» balance ≈ −۱،۵۰۰،۰۰۰،۰۰۰
- ۵۱ تراکنش با `account_id` → این دو ردیف
- هیچ ردیفی در partners یا partner_branches نیست

### ترتیب امن deploy

```
مرحله ۱ — SQL (backward-compatible، می‌توان قبل از deploy کد اجرا کرد):
  SQL-A: CREATE TABLE partners
  SQL-B: CREATE TABLE partner_branches
  SQL-C: ALTER TABLE accounts ADD COLUMN partner_id uuid → partners(id)

مرحله ۲ — Deploy کد (API/store/UI را آپدیت می‌کند):
  - API /api/accounts: partner_id را در response برمی‌گرداند
  - API /api/partners: CRUD جدید
  - Store: partnersSlice جدید
  - UI: فیلتر equity در accounts page و dashboard
  - فرم تراکنش: grouping در account select

مرحله ۳ — SQL (data migration — اجرا پس از deploy موفق):
  SQL-D: INSERT INTO partners (حسین شرف, شهریار شرف)
  SQL-E: INSERT INTO partner_branches (حسین→A.S.P, شهریار→A.S.P)
  SQL-F: UPDATE accounts SET type='partner_equity', partner_id=... WHERE name=...
```

### فایل SQL کامل migration (برای تأیید کاربر، اجرا نشده)

```sql
-- db-ownership-model-migration.sql
-- مدل مالکیت — شرکا، آورده سرمایه.
-- اجرا: مرحله ۱ (SQL-A,B,C) قبل از deploy کد.
--        مرحله ۳ (SQL-D,E,F) بعد از deploy موفق.
-- همه statements idempotent هستند.

-- ════════════════════════════
-- مرحله ۱ — ساختار (backward-compatible)
-- ════════════════════════════

-- SQL-A: جدول شرکا
CREATE TABLE IF NOT EXISTS partners (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name   text        NOT NULL,
  phone       text,
  national_id text,
  note        text,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- SQL-B: رابطه شریک↔شعبه
CREATE TABLE IF NOT EXISTS partner_branches (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id    uuid        NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
  branch_id     uuid        NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  share_percent numeric(5,2),
  joined_date   text,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_branches_unique UNIQUE (partner_id, branch_id)
);

CREATE INDEX IF NOT EXISTS pb_partner_idx ON partner_branches (partner_id);
CREATE INDEX IF NOT EXISTS pb_branch_idx  ON partner_branches (branch_id);

-- SQL-C: ستون partner_id روی accounts
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='accounts' AND column_name='partner_id'
  ) THEN
    ALTER TABLE accounts
      ADD COLUMN partner_id uuid REFERENCES partners(id) ON DELETE RESTRICT;
    CREATE INDEX accounts_partner_id_idx ON accounts (partner_id)
      WHERE partner_id IS NOT NULL;
  END IF;
END $$;

-- ════════════════════════════
-- مرحله ۳ — داده (بعد از deploy کد)
-- ════════════════════════════

-- SQL-D: درج شرکا
-- ⚠️ قبل از اجرا: مطمئن شوید نام‌ها دقیقاً با DB تطابق دارند
-- اجرا کنید: SELECT id, name FROM accounts WHERE name ILIKE '%شرف%';

-- این INSERT ها idempotent هستند (در صورت تکرار conflict روی name نمی‌دهند،
-- چون unique constraint روی full_name نداریم — در اولین اجرا کافی است)
INSERT INTO partners (id, full_name)
VALUES
  ('<<UUID-حسین>>'::uuid,   'حسین شرف'),
  ('<<UUID-شهریار>>'::uuid, 'شهریار شرف')
ON CONFLICT DO NOTHING;
-- ⚠️ UUID‌های بالا باید قبل از اجرا با gen_random_uuid() یا مقدار دلخواه پر شوند

-- SQL-E: درج partner_branches
-- ⚠️ branch_id شعبه A.S.P را از: SELECT id, name FROM branches; بگیرید
INSERT INTO partner_branches (partner_id, branch_id, joined_date)
VALUES
  ('<<UUID-حسین>>'::uuid,   '<<UUID-ASP>>'::uuid, '۱۴۰۳/۰۸/۰۱'),
  ('<<UUID-شهریار>>'::uuid, '<<UUID-ASP>>'::uuid, '۱۴۰۳/۰۸/۰۱')
ON CONFLICT (partner_id, branch_id) DO NOTHING;

-- SQL-F: آپدیت accounts
-- ⚠️ اسامی دقیق accounts را با این query تأیید کنید:
--    SELECT id, name, type, balance FROM accounts WHERE name ILIKE '%شرف%';
UPDATE accounts
SET
  type       = 'partner_equity',
  partner_id = '<<UUID-حسین>>'::uuid,
  updated_at = NOW()
WHERE name = 'صندوق حسین شرف'
  AND type  = 'cash';   -- idempotent: فقط اگر هنوز cash باشد

UPDATE accounts
SET
  type       = 'partner_equity',
  partner_id = '<<UUID-شهریار>>'::uuid,
  updated_at = NOW()
WHERE name = 'صندوق شهریار شرف'
  AND type  = 'cash';

-- تأییدیه نهایی:
-- SELECT a.name, a.type, a.balance, p.full_name
-- FROM accounts a
-- LEFT JOIN partners p ON p.id = a.partner_id
-- WHERE a.type = 'partner_equity';
-- انتظار: ۲ ردیف، balance منفی، full_name پر
```

### ضمانت امنیت migration
- هیچ ردیفی از `transactions` حذف یا جابجا نمی‌شود
- `accountId` در transactions دست‌نخورده می‌ماند
- `balance` دو account تغییر نمی‌کند (منطق recalculate یکسان است)
- تنها تغییر: `type` و `partner_id` روی ۲ ردیف از accounts

---

## ۵. فازبندی اجرا

### فاز ۰ — DB ساختار (فقط SQL — اجرا با مالک)
**محتوا:** SQL-A (partners) + SQL-B (partner_branches) + SQL-C (partner_id column روی accounts)
**Migration:** بله — `db-ownership-model-migration.sql` بخش «مرحله ۱»
**تست:** `SELECT * FROM partners; SELECT * FROM partner_branches; \d accounts;` → باید اجرا شود بدون خطا
**ریسک:** صفر — فقط جدول جدید و ستون nullable اضافه می‌شود. هیچ رفتاری تغییر نمی‌کند

---

### فاز ۱ — API و Schema (کد)
**محتوا:**
- Drizzle schema: `partners` + `partnerBranches` + `partnerId` روی `accounts`
- `app/api/partners/route.ts` — GET (list) + POST (create)
- `app/api/partners/[id]/route.ts` — PATCH, DELETE (soft)
- `app/api/accounts/route.ts` — اضافه کردن `partnerId` به response
- `app/api/accounts/recalculate/route.ts` — بدون تغییر (همه accounts را بازسازی می‌کند — equity هم درست است)
- `types/transaction.ts` — اضافه کردن `partnerId?: string | null` به `Account`
- `store/slices/partnersSlice.ts` — جدید (loadPartners, createPartner, ...)
**Migration:** ندارد (بعد از فاز ۰)
**تست:** `GET /api/partners` → `[]`, `GET /api/accounts` → partnerId در response

---

### فاز ۲ — UI مدیریت شرکا و اصلاح accounts
**محتوا:**
- `app/(app)/partners/page.tsx` — صفحه مدیریت شرکا (افزودن، ویرایش، حذف نرم)
- `app/(app)/partners/[id]/page.tsx` — پروفایل شریک: لیست شعب + آورده هر شعبه
- `app/(app)/accounts/page.tsx` — تفکیک موجودی عملیاتی vs equity + grouping شعبه/ستادی
- `app/(app)/dashboard/page.tsx` — بخش «شرکا» از partners API خوانده شود (نه contacts)
- nav-config.ts — اضافه کردن منوی «شرکا»
**Migration:** ندارد
**تست:** صفحه accounts موجودی عملیاتی و equity جدا نشان می‌دهد

---

### فاز ۳ — Data migration (اجرای SQL با مالک + اتصال در UI)
**محتوا:**
- اجرای SQL-D + SQL-E + SQL-F (بعد از تأیید نام‌ها از DB)
- بعد از اجرا: `app/(app)/partners/page.tsx` دو شریک را نشان می‌دهد
- dashboard بخش «شرکا» از partners می‌خواند (جای contacts)
**Migration:** بله — SQL بخش «مرحله ۳»
**تست:** صفحه partners: حسین −۶.۵م + شهریار −۱.۵م | accounts: totalBalance فقط عملیاتی

---

### فاز ۴ — فرم تراکنش (انتخاب سلسله‌مراتبی + ساده‌سازی)
ادغام **فاز B** از سند قبلی (accordion) با طراحی این سند.

**محتوا:**
- `app/(app)/transactions/new/page.tsx` — account select با grouping (عملیاتی / آورده شرکا)
- filter: فقط accounts هم‌scope با شعبه انتخاب‌شده
- برچسب بصری equity (رنگ violet، پیش‌وند «آورده:»)
- accordion «جزئیات بیشتر» از سند قبلی
**Migration:** ندارد
**تست:** انتخاب شعبه A.S.P → فقط accounts آن شعبه + ستادی نمایش داده شوند

---

### فاز D — یکپارچگی دکمه‌ها (از سند قبلی)
**محتوا:** جایگزینی custom `<button>` با `<Button>` در جاهایی که با کامپوننت استاندارد کنار هم نشسته‌اند.

**اولویت:** کمترین. می‌توان بعد از فازهای ۱–۴ انجام داد.

---

### جدول زمانی پیشنهادی

```
فاز ۰   → SQL با مالک (۱ جلسه — ۵ دقیقه در pgAdmin)
فاز ۱   → ۱ commit (API + schema)
فاز ۲   → ۲–۳ commit (UI شرکا + accounts)
فاز ۳   → SQL با مالک + ۱ commit کوچک (اتصال dashboard)
فاز ۴   → ۱–۲ commit (فرم)
فاز D   → ۱ commit (refactor)
```

---

## ۶. سؤالات باز (نیاز به تصمیم مالک)

**سؤال ۱ — آورده ستادی:**
> آیا یک شریک می‌تواند به کل مجموعه (نه یک شعبه خاص) آورده بگذارد؟
> مثال: حسین ۵۰م برای خرید تجهیزات مشترک گذاشته.
>
> اگر **بله**: `partner_branches` باید بتواند `branch_id=null` داشته باشد (نیاز به تغییر UNIQUE constraint).
> اگر **خیر**: `branch_id NOT NULL` می‌شود و فرم «ستادی» نمی‌تواند equity account داشته باشد.

**سؤال ۲ — نوع تراکنش‌های آورده:**
> تراکنش‌های pre-opening الان `type='expense'` روی حساب equity هستند.
> آورده‌های جدید (وقتی شریک پول می‌گذارد) چه نوعی باشند؟
>
> گزینه‌ها:
> - `type='income'` → در KPIهای درآمد ظاهر می‌شود (گمراه‌کننده)
> - `type='transfer'` از equity → صندوق عملیاتی (منطقی‌ترین — شریک پول می‌گذارد → صندوق پر می‌شود)
> - نوع جدید `equity_in` / `equity_out` (پیچیده‌تر، نیاز به schema change)
>
> **پیشنهاد:** `transfer` از equity account به صندوق عملیاتی — semantics درست است و بدون schema جدید.

**سؤال ۳ — خروج شریک از یک شعبه:**
> اگر شریکی از یک شعبه خارج شود، account equity آن شعبه چه وضعی پیدا کند؟
> - `is_active=false` روی partner_branches + `is_active=false` روی account equity؟
> - یا تسویه (یک تراکنش برگشت) و سپس deactivate؟

**سؤال ۴ — داشبورد: بخش «شرکا» فعلی:**
> بخش «وضعیت شرکا» در داشبورد فعلاً از **contacts** می‌خواند (همه contacts با balance != 0).
> پس از فاز ۲، این بخش از partners می‌خواند.
>
> سؤال: آیا contacts غیر-شریک (پیمانکار صدرا، تأمین‌کننده) هنوز باید در داشبورد نمایش داده شوند یا فقط شرکا؟
> (فعلاً طراحی شده که فقط شرکا نمایش داده شوند — contacts به صفحه‌ی خودشان منتقل می‌شوند)

---

## خلاصه تصمیمات این سند

| موضوع | تصمیم |
|---|---|
| ساختار شریک | جدول `partners` جدید (نه contacts با type='partner') |
| رابطه شریک↔شعبه | جدول `partner_branches` با share_percent nullable |
| حساب equity | ستون `partner_id` روی accounts موجود + type='partner_equity' |
| مهاجرت ۵۱ تراکنش | هیچ تراکنشی جابجا نمی‌شود — فقط type+partner_id دو account تغییر می‌کند |
| ترتیب deploy | SQL مرحله ۱ → کد → SQL مرحله ۳ |
| فرم تراکنش | grouping equity/عملیاتی + filter scope + accordion از سند قبلی |
| موجودی کل | همیشه فقط عملیاتی (بدون equity) |
| contacts | دست‌نخورده می‌مانند — پاکسازی در فاز جداگانه (از سند قبلی فاز C) |
