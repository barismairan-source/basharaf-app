# مشخصات صحت مالی (Financial Integrity Specification)
## هدف: رساندن سامانه «با شرف» به سطح SAP-light — غیرقابل‌نفوذ در برابر mismatch، double-count و قفل‌شدگی state

> این سند، **مرجع رسمی قوانین مالی** پروژه است. هر تغییری در مسیر تراکنش‌ها،
> صندوق‌ها، طرف‌حساب‌ها، یا اتصال منو↔مالی باید با این قوانین سازگار باشد.
> هرگونه ناسازگاری بین کد و این سند یک **باگ درجه‌ی بحرانی (Critical)** محسوب می‌شود.

---

## ۱. ماشین حالت تأیید (Approval State Machine)

### ۱.۱ — حالت‌های مجاز
```
pending  →  approved   (تأیید توسط SuperAdmin)
pending  →  rejected   (رد توسط SuperAdmin، با دلیل)
approved →  (Reverse)  (فقط از طریق DELETE یا ویرایش amount/account — هرگز "approved → pending" مستقیم)
```

**قانون طلایی شماره ۱:** هیچ تراکنشی هرگز نباید از `approved` یا `rejected` به `pending` بازگردد.
این یک گذار **ممنوع** است — چون اثرات مالی (تغییر موجودی صندوق/طرف‌حساب/COGS) قبلاً به‌صورت
برگشت‌ناپذیر اعمال شده و بازگشت به pending باعث می‌شود تراکنش بتواند **دوباره** approve شود → دو بار اعمال اثر (double-count).

### ۱.۲ — قوانین گذار

| از حالت | به حالت | مجاز؟ | شرایط | اثرات جانبی الزامی |
|---|---|---|---|---|
| `pending` | `approved` | ✅ | فقط SuperAdmin؛ idempotent (چک `status === 'pending'` قبل از commit) | `applyBalance` + `applyContactBalance` (اگر `isCredit`) + در صورت `saleMeta` معتبر → `applyMenuSaleDeduction` + ثبت سند COGS |
| `pending` | `rejected` | ✅ | فقط SuperAdmin؛ نیازمند `rejectionReason` (یا مقدار پیش‌فرض) | بدون اثر مالی (چون هرگز اعمال نشده) — فقط notification |
| `approved` | `rejected` | ❌ | — | ممنوع؛ اگر تراکنش اشتباه تأیید شده، باید Reverse/Rollback رسمی انجام شود (بند ۱.۳) نه «رد» |
| `rejected` | `approved` | ❌ | — | ممنوع؛ تراکنش رد‌شده باید دوباره از صفر (نسخه‌ی جدید pending) ثبت شود |
| `approved`/`rejected` | `pending` | ❌ | — | **ممنوعیت مطلق** — منبع اصلی ریسک double-count |

### ۱.۳ — Reverse / Rollback رسمی برای تراکنش‌های `approved`

تنها دو مسیر رسمی برای خنثی‌کردن یک تراکنش `approved` وجود دارد و هر دو باید **اتمیک** (`db.transaction`) باشند:

1. **حذف (`DELETE /api/transactions/[id]`):**
   - پیش از `delete`، باید **دقیقاً به همان ترتیب معکوس اعمال** برگردانده شود:
     `reverseBalance` → `reverseContactBalance` → (در صورت وجود `saleMeta.deductedAt`) → معکوس‌سازی کسر انبار + حذف/ابطال سند COGS مرتبط
   - وضعیت فعلی: کد `reverseBalance`/`reverseContactBalance` را قبل از حذف صدا می‌زند ✅، اما **کسر انبار ناشی از `saleMeta` و سند COGS مرتبط هرگز Reverse نمی‌شوند** ❌ (نقص شناسایی‌شده — به بند ۵ مراجعه شود).

2. **ویرایش مبلغ/حساب یک تراکنش `approved` (`PATCH /api/transactions/[id]`):**
   - الگوی صحیح: `reverse(old) → update → apply(new)` در یک `db.transaction` — این الگو در PATCH فعلی برای `amount` رعایت شده ✅
   - اما تغییر `accountId`/`destinationAccountId`/`type`/`isCredit`/`contactId` روی تراکنش `approved` **اصلاً مدیریت نشده** — این فیلدها حتی در `patchBodySchema` وجود ندارند. اگر کسی مستقیماً این فیلدها را در دیتابیس تغییر دهد یا schema گسترش یابد، balance قدیمی هرگز معکوس نمی‌شود ❌.

**قانون طلایی شماره ۲:** هر مسیر Reverse باید **تمام** اثرات جانبی تأیید (balance، contact balance، کسر انبار/COGS، اعلان‌ها) را به ترتیب دقیقاً معکوس برگرداند — نه فقط زیرمجموعه‌ای از آن‌ها. اثر جزئی (partial reversal) بدتر از عدم reversal است چون ردیابی آن سخت‌تر می‌شود.

### ۱.۴ — Idempotency Guard اجباری
هر state transition باید با یک چک صریح از حالت فعلی شروع شود:
```ts
if (current.status !== 'pending') throw new ApiError(409, '...', 'INVALID_STATE');
```
این چک باید **داخل همان تراکنش دیتابیسی** (یا حداقل بلافاصله قبل از آن با قفل ردیف) انجام شود تا
دو درخواست همزمان approve نتوانند هر دو از این چک عبور کنند (race condition روی state).
**توصیه:** برای جلوگیری از race، از `SELECT ... FOR UPDATE` در ابتدای `db.transaction` استفاده شود
(در حال حاضر چک قبل از `db.transaction` انجام می‌شود — پنجره‌ی race هرچند کوچک، باز است).

---

## ۲. عملیات اتمیک برای انتقالات (Transfers) — به‌سبک Double-Entry Bookkeeping

### ۲.۱ — اصل بنیادین
هر تراکنش مالی باید معادل یک **جفت ثبت (debit/credit)** در نظر گرفته شود، حتی اگر در schema
فعلی به‌صورت یک ردیف با `accountId` + `destinationAccountId` نگه‌داری می‌شود:

| نوع | اثر روی مبدأ (`accountId`) | اثر روی مقصد (`destinationAccountId`) | معادل Double-Entry |
|---|---|---|---|
| `income` | `+amount` | — | Debit: Cash/Bank — Credit: Revenue |
| `expense` | `-amount` | — | Debit: Expense — Credit: Cash/Bank |
| `transfer` | `-amount` | `+amount` | Debit: Destination — Credit: Source |

### ۲.۲ — قوانین لازم‌الاجرا برای Transfer

1. **اتمیسیته‌ی کامل:** هر دو ردیف بروزرسانی (`-amount` در مبدأ، `+amount` در مقصد) باید درون
   **یک** `db.transaction` باشند و **یک** ردیف `transactions` آن‌ها را نمایندگی کند — هرگز دو رکورد
   جدا برای مبدأ/مقصد ساخته نشود (این خود منبع رایج double-counting در ERPهای ضعیف است).
   ✅ این الگو در `applyBalance`/`reverseBalance` فعلی برای `transfer` رعایت شده.

2. **شرط معتبر بودن:**
   - `accountId !== destinationAccountId` (انتقال به خود مجاز نیست) — **در حال حاضر این validation در سطح Zod schema یا route وجود ندارد** ❌ (نقص — بند ۵).
   - هر دو حساب باید فعال (`isActive = true`) و متعلق به دامنه‌ی دسترسی کاربر باشند.

3. **عدم وابستگی به موجودی منفی:** سیستم فعلی اجازه می‌دهد موجودی صندوق منفی شود (هیچ چک
   `balance >= amount` وجود ندارد). تصمیم معماری: یا این رفتار آگاهانه پذیرفته شود (برای
   انعطاف نقدی رستوران) و در UI/گزارش هشدار داده شود، یا یک `CHECK` محدودکننده اضافه گردد.
   **این سند رفتار فعلی (اجازه‌ی منفی‌شدن با هشدار) را به‌عنوان سیاست رسمی می‌پذیرد** — اما
   باید به‌صراحت در گزارش‌ها (`/reports`) به‌صورت یک هشدار قرمز نمایش داده شود.

4. **اتمیسیته‌ی سطح SQL:** تمام به‌روزرسانی‌های موجودی باید با عبارات SQL نسبی
   (`balance = balance + ${amount}`) انجام شوند — **نه** `read → compute in JS → write` —
   تا race condition بین دو تراکنش هم‌زمان روی یک حساب رخ ندهد.
   ✅ این الگو در `balanceHelpers.ts` با `sql\`balance + ${amount}\`` رعایت شده — این بخش از
   سیستم در حال حاضر **منطبق با استاندارد SAP-light** است و باید به‌عنوان الگوی مرجع برای
   تمام جداول دارای «موجودی» (`accounts.balance`, `contacts.balance`, آینده: `customers`/loyalty `points`) حفظ شود.

---

## ۳. سیاست «ویرایش پس از تأیید» (Edit-After-Approval Policy)

تفکیک دقیق میان جهش‌های **مالی (Financial)** و **غیرمالی (Non-financial)**:

### ۳.۱ — جهش‌های غیرمالی (همیشه مجاز، بدون اثر جانبی)
فیلدهایی که تغییرشان **هیچ** اثری روی `balance`، `contact.balance`، انبار، یا گزارش‌های مالی ندارند:
```
title, payee, method, receipt, receiptUrl, note, categoryId* , date**
```
> \* تغییر `categoryId` تنها `categoryName` را به‌روزرسانی می‌کند — تأثیری بر مبلغ ندارد، اما
>   روی **گزارش‌های دسته‌بندی‌شده‌ی گذشته** اثر می‌گذارد؛ توصیه می‌شود این تغییر را هم Audit کند (در حال حاضر نمی‌کند ❌).
> \** تغییر `date` پس از تأیید روی گزارش‌های دوره‌ای (مثلاً ماهانه) اثر می‌گذارد و باید Audit شود (در حال حاضر نمی‌شود ❌).

این تغییرات می‌توانند مستقیماً `UPDATE` شوند — بدون نیاز به `db.transaction` یا reverse/apply.

### ۳.۲ — جهش‌های مالی (نیازمند چرخه‌ی کامل Reverse → Apply)
فیلدهایی که روی موجودی/مانده اثر مستقیم دارند:
```
amount, accountId, destinationAccountId, type, isCredit, contactId, vatAmount
```

**قانون طلایی شماره ۳:** اگر تراکنش `status === 'approved'` است و **هر یک** از فیلدهای بالا
تغییر کند، باید این چرخه‌ی اتمیک اجرا شود:

```
db.transaction:
  1. reverseBalance(old)        — خنثی‌سازی اثر قبلی روی accounts
  2. reverseContactBalance(old) — خنثی‌سازی اثر قبلی روی contacts
  3. UPDATE transactions SET ...new values
  4. applyBalance(new)          — اعمال اثر جدید روی accounts
  5. applyContactBalance(new)   — اعمال اثر جدید روی contacts
  6. audit('transaction.financialEdit', { before, after })  ← باید اضافه شود
```

**وضعیت فعلی PATCH:** فقط تغییر `amount` این چرخه را فعال می‌کند. تغییر `accountId`,
`destinationAccountId`, `type`, `isCredit`, `contactId` نه در Zod schema پذیرفته می‌شوند و نه
این چرخه را فعال می‌کنند ❌ — این یک **حفره‌ی امنیتی-مالی** است: اگر این فیلدها در آینده به
schema اضافه شوند بدون رعایت این قانون، balance قدیمی هرگز معکوس نخواهد شد.

**سیاست رسمی:** یا این فیلدها را به‌طور **کامل و دائمی غیرقابل‌ویرایش پس از approve** اعلام کنیم
(و فقط مسیر Reverse-and-recreate را مجاز بدانیم — ساده‌تر و امن‌تر، مشابه بسیاری از ERPهای واقعی
که «approved invoice line items are immutable»)، یا چرخه‌ی بالا را برای تمام این فیلدها پیاده‌سازی کنیم.
**توصیه‌ی این سند: گزینه‌ی اول (immutability) — کمترین سطح ریسک.**

### ۳.۳ — جهش‌های ممنوع (حتی برای SuperAdmin)
- تغییر `status` به‌صورت مستقیم (خارج از مسیرهای approve/reject رسمی)
- تغییر `createdBy`, `approvedBy`, `approvedAt`, `rejectedBy`, `rejectedAt` (فیلدهای audit trail — باید فقط append-only باشند)
- تغییر `saleMeta.deductedAt` به‌صورت دستی (شکستن idempotency guard کسر انبار)

---

## ۴. منطق گمشده‌ی `is_credit` و همگام‌سازی مانده‌ی طرف‌حساب (Contact Balance)

### ۴.۱ — قرارداد فعلی (مستند در کامنت schema، اما ناقص پیاده‌سازی شده)
```
balance > 0  →  طرف‌حساب به ما بدهکار است (طلب ما)
balance < 0  →  ما به طرف‌حساب بدهکار هستیم
isCredit     →  این تراکنش نسیه (پرداخت‌نشده) است و باید مانده‌ی طرف‌حساب را تغییر دهد
```

### ۴.۲ — قوانین رسمی `applyContactBalance` / `reverseContactBalance`

| `type` | `isCredit` | اثر روی `contact.balance` | تفسیر تجاری |
|---|---|---|---|
| `income` | `true` | `+amount` | فروش نسیه — مشتری بدهکار شد |
| `income` | `false` | بدون اثر | فروش نقدی — هیچ نسیه‌ای ثبت نشد |
| `expense` | `true` | `-amount` | خرید نسیه — ما به تأمین‌کننده بدهکار شدیم |
| `expense` | `false` | بدون اثر | خرید نقدی |
| `transfer` | * | بدون اثر | انتقال داخلی هرگز طرف‌حساب ندارد |

✅ منطق فعلی `applyContactBalance`/`reverseContactBalance` این جدول را به‌درستی پیاده می‌کند.

### ۴.۳ — حلقه‌ی گمشده: «تسویه‌ی نسیه» (Settlement)

**این مهم‌ترین نقص شناسایی‌شده در حوزه‌ی `is_credit` است:**
سیستم فعلی فقط می‌داند چگونه یک نسیه را **ثبت** کند (`applyContactBalance` در زمان تأیید) — اما
**هیچ مسیر رسمی برای «تسویه/پرداخت نسیه» وجود ندارد**. یعنی وقتی مشتری بدهی‌اش را پرداخت می‌کند
یا ما بدهی تأمین‌کننده را تسویه می‌کنیم، چه باید رخ دهد؟

**بلوپرینت رسمی پیشنهادی برای تسویه:**
1. تسویه باید خودش یک تراکنش معمولی (`type: income` یا `expense`, `isCredit: false`,
   `contactId` پر شده، یک فیلد جدید boolean مثل `isSettlement: true`) باشد.
2. اثر آن روی `contacts.balance` باید **عکس** جهت ثبت اولیه باشد:
   - تسویه‌ی بدهی مشتری (آن‌ها به ما بدهکار بودند) → دریافت وجه → `contact.balance -= amount`
   - تسویه‌ی بدهی ما به تأمین‌کننده → پرداخت وجه → `contact.balance += amount`
3. باید یک محدودیت soft (هشدار، نه block) وجود داشته باشد که تسویه نباید از `|balance|` فعلی
   طرف‌حساب بیشتر شود (پرداخت اضافه‌تر از بدهی) — یا این مازاد را به‌عنوان «پیش‌پرداخت» (`balance` با علامت معکوس) ثبت کند.
4. باید لینک دوطرفه بین «تراکنش نسیه‌ی اصلی» و «تراکنش‌های تسویه» نگه‌داری شود
   (پیشنهاد: جدول junction جدید `contact_settlements` یا فیلد jsonb `settledTransactionIds`
   مشابه الگوی `saleMeta` — تا گزارش «سن بدهی» (Aging Report) ممکن شود).

### ۴.۴ — ریسک Drift (واگرایی) و راهکار
`contact.balance` یک مقدار **denormalized** (محاسبه‌شده و ذخیره‌شده) است — دقیقاً مثل
`account.balance`. این یعنی در طول زمان ممکن است با مجموع واقعی تراکنش‌های نسیه واگرا شود
(باگ، migration ناقص، دستکاری مستقیم دیتابیس). **پروژه از قبل یک الگوی صحیح برای این مشکل
در `accounts` دارد:** مسیر `POST /api/accounts/recalculate` که موجودی را از صفر، از روی
تراکنش‌های `approved` بازسازی می‌کند.

**قانون طلایی شماره ۴:** یک مسیر معادل، `POST /api/contacts/recalculate`، باید ساخته شود که
`contact.balance` را از روی مجموع `(amount × جهت) برای تمام تراکنش‌های approved با
contactId = X و isCredit = true` بازسازی کند — این، تنها راه رسمی اثبات صحت (reconciliation) است.

---

## ۵. بلوپرینت معماری: پل بین کاتالوگ منو و مالی (Menu Catalog → Orders → Transactions)

### ۵.۱ — وضعیت فعلی (Shortcut، نه معماری رسمی)
در حال حاضر **هیچ موجودیت `Order` مستقلی وجود ندارد**. فروش منو مستقیماً به یک ردیف
`transactions` با `type='income'` و یک فیلد `jsonb` به نام `saleMeta = { lines: [{menuItemId, qty}], deductedAt? }`
تبدیل می‌شود. این یک میان‌بر کاربردی اما شکننده است:

- ❌ هیچ رکورد مستقلی از «سفارش» وجود ندارد که بتوان آن را مستقل از وضعیت مالی ردیابی کرد
  (مثلاً سفارش در حال آماده‌سازی در آشپزخانه، قبل از صدور صورت‌حساب).
- ❌ `saleMeta` نوع `any`/`jsonb` است — بدون اعتبارسنجی schema سطح دیتابیس؛ خطای ساختاری در
  آن (مثلاً `menuItemId` نامعتبر) فقط در زمان `approve` کشف می‌شود، نه در زمان ثبت.
- ❌ امکان گزارش‌گیری «پرفروش‌ترین آیتم‌های منو» یا «میانگین زمان آماده‌سازی» وجود ندارد چون
  داده در `jsonb` مدفون است نه در جدول رابطه‌ای queryable.
- ✅ نقطه‌ی قوت: idempotency با `deductedAt` به‌خوبی از کسر تکراری انبار جلوگیری می‌کند.

### ۵.۲ — معماری رسمی پیشنهادی (سه‌لایه، با مهاجرت تدریجی)

```
┌──────────────┐     ┌───────────────┐     ┌──────────────────┐
│ Menu Catalog │ ──▶ │     Order     │ ──▶ │   Transaction    │
│ (menu_items) │     │ (orders +     │     │ (مالی — همان     │
│              │     │  order_lines) │     │  جدول فعلی)      │
└──────────────┘     └───────────────┘     └──────────────────┘
   کاتالوگ ثابت        رویداد عملیاتی          رویداد مالی
   (قیمت، دسته،        (چرخه‌ی حیات سفارش،      (approval state
    موجود/ناموجود)      مستقل از مالی)           machine، GL)
```

**جداول پیشنهادی جدید:**

```
orders
  id, branchId, status ('open'|'submitted'|'paid'|'cancelled'),
  tableId? (← اتصال به batch4 reservations/tables),
  customerId? (← اتصال به batch4 customers/loyalty),
  subtotal, vatAmount, total,
  transactionId? (← لینک یک‌به‌یک به رکورد مالی نهایی، فقط پس از 'paid'),
  createdBy, createdAt, ...

order_lines
  id, orderId, menuItemId, qty, unitPrice (snapshot — نه رفرنس به menu_items.price!),
  note?
```

**چرا `unitPrice` باید snapshot باشد و نه رفرنس زنده؟**
چون اگر قیمت منو بعداً تغییر کند، گزارش‌های مالی تاریخی نباید تغییر کنند — این دقیقاً
همان اصلی است که در `inv_voucher_lines.estUnitCost`/`finalUnitCost` (Batch 3) رعایت شده.

**ماشین حالت سفارش (مستقل از ماشین حالت مالی):**
```
open → submitted → paid → (تولید خودکار یک Transaction با saleMeta معادل، type=income, status=pending)
                 ↘ cancelled  (بدون اثر مالی)
```

### ۵.۳ — استراتژی مهاجرت (بدون شکستن جریان فعلی)
1. **فاز ۱ (سازگار به‌عقب):** جداول `orders`/`order_lines` اضافه شوند، اما مسیر فعلی
   (`saleMeta` روی `transactions`) دست‌نخورده باقی بماند. هر `order` که `paid` می‌شود،
   هم یک `transaction` با `saleMeta` (برای سازگاری) و هم خطوط رابطه‌ای در `order_lines`
   تولید کند (دوگانه‌نویسی موقت برای گزارش‌گیری جدید).
2. **فاز ۲:** گزارش‌های جدید (پرفروش‌ترین آیتم، تحلیل ساعتی فروش) از `order_lines` بخوانند —
   نه از `saleMeta`.
3. **فاز ۳ (نهایی):** پس از اطمینان از صحت داده‌ها، `saleMeta` به یک فیلد صرفاً نمایشی/بایگانی
   تقلیل یابد و منطق `applyMenuSaleDeduction` از روی `order_lines` اجرا شود (نه `saleMeta.lines`).

**قانون طلایی شماره ۵:** پل بین منو و مالی هرگز نباید مستقیم باشد — همیشه باید از یک
موجودیت میانی «سفارش» با چرخه‌ی حیات مستقل عبور کند، تا تغییرات عملیاتی (لغو سفارش در آشپزخانه)
از تغییرات مالی (ابطال صورت‌حساب) به‌طور کامل تفکیک بمانند.

---

## ۶. خلاصه‌ی نواقص شناسایی‌شده (برای اولویت‌بندی رفع — بخش بعدی این سند را ببینید)

| # | نقص | شدت | محل |
|---|---|---|---|
| 1 | Reverse/Delete یک تراکنش approved با `saleMeta.deductedAt`، کسر انبار و سند COGS مرتبط را معکوس/باطل نمی‌کند | 🔴 بحرانی | `app/api/transactions/[id]/route.ts` (DELETE) |
| 2 | PATCH روی تراکنش `approved` اجازه نمی‌دهد (و حتی اگر بدهد، چرخه‌ی reverse/apply ندارد) برای `accountId`, `destinationAccountId`, `type`, `isCredit`, `contactId` | 🔴 بحرانی | `app/api/transactions/[id]/route.ts` (PATCH), `lib/db/balanceHelpers.ts` |
| 3 | عدم وجود مسیر «تسویه‌ی نسیه» (Settlement) برای `contacts.balance` | 🟠 بالا | جدید — نیاز به route + احتمالاً جدول جدید |
| 4 | عدم وجود `POST /api/contacts/recalculate` برای reconciliation مانده‌ی طرف‌حساب | 🟠 بالا | جدید — معادل `app/api/accounts/recalculate/route.ts` |
| 5 | عدم اعتبارسنجی `accountId !== destinationAccountId` برای transfer | 🟡 متوسط | `app/api/transactions/route.ts` (POST schema) |
| 6 | تغییر `categoryId`/`date` پس از تأیید، Audit نمی‌شود | 🟡 متوسط | `app/api/transactions/[id]/route.ts` (PATCH) |
| 7 | چک `status !== 'pending'` خارج از `db.transaction` انجام می‌شود → پنجره‌ی race کوچک در concurrent approve | 🟡 متوسط | `approve/route.ts`, `reject/route.ts` |
| 8 | `saleMeta` به‌صورت `jsonb` بدون schema رابطه‌ای — نبود موجودیت `Order` مستقل | 🟢 معماری/بلندمدت | کل لایه‌ی فروش منو |

---

*این سند باید با هر تغییر در منطق approval/balance/contact به‌روزرسانی شود. نسخه‌ی اولیه — تاریخ تدوین: تیر ۱۴۰۵ (۲۰۲۶/۰۶/۰۸).*
