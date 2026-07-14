# HANDOFF.md — دفتر وضعیت زنده‌ی پروژه «با شرف»

> این فایل **دفتر رله‌ی بین دو اکانت Claude Code** است که نوبتی روی همین پوشه کار می‌کنند.
> قانون طلایی: **هر جلسه اول بخش ۰ را بخوان؛ آخر جلسه بخش ۰ + ژورنال را به‌روز کن و commit/push کن.**
> جزئیات تاریخی قدیمی‌تر: `project-docs/handoff-archive.md`.

---

## ⚡ بخش ۰ — وضعیت لحظه‌ای (اول این را بخوان)

| | |
|---|---|
| **نسخه** | `0.23.0` |
| **آخرین به‌روزرسانی** | 2026-07-14 — اکانت: ۱ |
| **Build/tsc** | tsc سبز ✅ (۰ خطا) · build ✅ |
| **دیپلوی** | ✅ GitHub Actions فعال. Branch: `main` — آماده push. |
| **کار نیمه‌تمام (in-progress)** | — |
| **کار بعدی پیشنهادی** | ۱) تست P&L drilldown در مرورگر (کلیک روی ردیف‌های سود/زیان). ۲) دسته‌های راه‌اندازی را در UI علامت بزنید (Settings → دسته‌ها). ۳) migrate برای unique constraint روی `parent_voucher_id` در `inv_vouchers` (حفاظت کامل در برابر race condition برگشت‌برگه). |
| **بلاک‌شده/منتظر کاربر** | — |

> ⚠️ **نکته مهم برای جلسات بعدی:** فرم `/apply` حالا کاملاً داینامیک و دیتابیس‌محور است. **دیگر فیلد hard-code به `app/apply/page.tsx` یا `lib/recruitment/` اضافه نکنید.** همه فیلدهای جدید باید از طریق `/recruitment/form-builder` ایجاد شوند.

> ⛔ **هشدار همزمانی:** هر دو اکانت روی **یک پوشه‌ی واحد** کار می‌کنند. **هرگز دو جلسه هم‌زمان باز نکنید** — تغییرات همدیگر را خراب می‌کنند. همیشه نوبتی: جلسه‌ی قبلی commit/push کرده باشد، بعد جلسه‌ی جدید شروع شود.

---

## 🔁 پروتکل رله‌ی دو اکانت

### شروع هر جلسه (الزامی — به ترتیب)
1. این فایل، بخش ۰ + جدیدترین ورودی ژورنال را بخوان.
2. `git status` بزن — اگر تغییرات commit‌نشده هست، یعنی جلسه‌ی قبل ناقص بسته شده: اول وضعیت را با کاربر روشن کن، چیزی را کورکورانه commit یا revert نکن.
3. `git log -5 --oneline` — تطبیق بده با ژورنال.
4. به کاربر خلاصه بگو: «وضعیت X است، کار نیمه‌تمام Y، پیشنهاد بعدی Z» و منتظر تأیید بمان.

### پایان هر جلسه / بعد از هر تغییر معنادار (الزامی)
1. یک ورودی ژورنال با **قالب زیر** به بالای بخش ژورنال اضافه کن.
2. بخش ۰ را به‌روز کن (نسخه، تاریخ، اکانت، کار نیمه‌تمام، کار بعدی).
3. اگر ژورنال بیش از **۷ ورودی** شد، قدیمی‌ها را به `project-docs/handoff-archive.md` منتقل کن.
4. `git add -A && git commit -m "..." && git push` — **بدون push جلسه را نبند.**
5. ⛔ **دیگر ZIP نساز** — GitHub Actions خودکار deploy می‌کند (از 2026-06-24).

### قالب اجباری ورودی ژورنال
```markdown
## 📓 [تاریخ] — [عنوان کوتاه] — اکانت [۱/۲]
**چه شد:** (۲–۵ خط، تصمیم‌های مهم + چرایی)
**فایل‌ها:** (مسیر کامل ایجاد/ویرایش‌شده‌ها)
**Build:** tsc/build سبز یا خطا + متن خطا
**ناتمام:** دقیقاً کجا متوقف شد، چه چیزی نیمه‌کاره است (اگر هیچ: «—»)
**برای جلسه‌ی بعد:** کار بعدی مشخص + هر هشداری که اکانت دیگر باید بداند
```

---

## 🏗 بخش ۴ — مرجع پایدار (قبل از دست‌زدن به مالی بخوان)

- `accounts.balance` فیلد **cache** است: همیشه از reverse transaction‌ها محاسبه شده. هر تراکنش معکوس جا مانده = drift دائمی.
- ⚠ **INVARIANT فاز ۵**: `accounts.balance` هرگز توسط فیلتر `is_setup` (لنز عملیاتی) تغییر نمی‌کند. این فیلتر فقط روی KPI‌های جریان مالی (income/expense/profit) در داشبورد و گزارش‌ها اثر دارد — ترازنامه مستقل است.
- پول **bigint تومان** در DB؛ در TypeScript `number` (JS safe integer تا ۹۰۰۰ تریلیون کافی است).
- تاریخ کاربری **جلالی text** (مثل `۱۴۰۳-۰۴-۱۵`)؛ تاریخ داخلی `timestamp` میلادی.
- `JWT_SECRET` حتماً ≥۳۲ کاراکتر.
- فرم `/apply` کاملاً داینامیک — فیلد hard-code اضافه نکن.

---

## 📓 ژورنال نشست‌ها (جدیدترین بالا — حداکثر ۷ ورودی)

## 📓 2026-07-14 — ممیزی امنیتی و رفع ۵ باگ بحرانی (v0.23.0) — اکانت ۱
**چه شد:** ممیزی کامل معماری (Principal Architect role) روی ۸ ریسک بحرانی. همه فایل‌های مرتبط مستقیماً خوانده و تأیید شدند. ۵ باگ واقعی رفع شد:
1. **Race condition در approve** (`app/api/transactions/[id]/approve/route.ts`): SELECT و status check به داخل `db.transaction()` منتقل شد؛ `.for('update')` اضافه شد — قفل ردیف قبل از هر بررسی.
2. **Import bypass** (`app/api/transactions/import/route.ts`): `requireSession()` → `requireAdmin()` — کاربر غیرادمین دیگر نمی‌تواند تراکنش مستقیماً approved ثبت کند.
3. **WAC race condition** (`lib/db/inventoryHelpers.ts`): `.for('update')` به SELECT‌های `receiveConfirmed`، `issueConfirmed`، و `stocktakeConfirmed` اضافه شد — جلوگیری از بازخوانی stale در تأیید همزمان چند برگه.
4. **Connection pool** (`lib/db/client.ts`): الگوی singleton برای همه‌ی محیط‌ها (dev + production) — برای Liara (container پایدار، نه serverless) یک pool کافی است.
5. **Monthly grouping اشتباه** (`app/api/reports/route.ts`): گروه‌بندی از `TO_CHAR(created_at, 'YYYY-MM')` (میلادی) به `SUBSTRING(date, 1, 7)` (جلالی) — ماه‌ها حالا با تاریخ سند تطبیق دارند نه زمان ثبت سیستم.
- **P&L drilldown تکمیل شد**: `PLRow` props `onClick`/`isOpen` اضافه شد؛ `DrillSection` component ساخته شد. endpoint `GET /api/reports/drilldown` آماده بود از جلسه قبل.
**فایل‌ها:** `lib/db/client.ts`، `lib/db/inventoryHelpers.ts`، `app/api/transactions/[id]/approve/route.ts`، `app/api/transactions/import/route.ts`، `app/api/reports/route.ts`، `app/(app)/reports/page.tsx`
**Build:** tsc ✅ ۰ خطا · build ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** ۱) تست drilldown در مرورگر. ۲) unique constraint روی `inv_vouchers.parent_voucher_id` (migration لازم) برای رفع کامل reversal race. ۳) دسته‌های راه‌اندازی در UI.

## 📓 2026-07-13 — فاز ۹ — sweep موبایل responsive (v0.22.0) — اکانت ۱
**چه شد:** Quick Wins ممیزی بصری اجرا شد. شاخه `fix/mobile-responsive-sweep` با ۳ commit ساخته و به main merge شد. تمام تغییرات فقط className — هیچ تغییر منطق یا API نداشت.
- **commit 1** (الگو ۱ — جداول): `cheques` table: `overflow-x-auto` + `min-w-[480px]` · `menu` categories table: `overflow-x-auto` + `min-w-[360px]`
- **commit 2** (الگو ۲ — گریدها): `employees` modal: ۶ مورد `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` · `payroll` payslip: `overflow-x-auto` wrapper + `min-w-[280px]`
- **commit 3** (الگوهای ۳و۴): `payroll` header: `flex-wrap` · `payroll` event modal: responsive grid · `inventory` expiry list: `max-h-64 overflow-y-auto`
**فایل‌ها:** `app/(app)/cheques/page.tsx`، `app/(app)/menu/page.tsx`، `app/(app)/employees/page.tsx`، `app/(app)/payroll/page.tsx`، `app/(app)/inventory/page.tsx`
**Build:** tsc ✅ ۰ خطا · build ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** ۱) کاربر روی گوشی واقعی ۵ صفحه را تست کند (ترتیب: purchase-orders → menu → payroll → recipes → cartable). ۲) دسته‌های راه‌اندازی در UI علامت بزند. ۳) P&L drilldown.

## 📓 2026-07-12 — ممیزی بصری/UX کد-محور (v0.21.1) — اکانت ۱
**چه شد:** ممیزی سیستماتیک ۱۸ صفحه‌ی کلیدی پنل از روی کد TSX — بر اساس ۶ معیار (سلسله‌مراتب، فاصله‌گذاری، یکدستی، حالت خالی، موبایل، کنتراست). نمره‌گذاری ۱–۵ برای هر صفحه.
**نتیجه‌ی کلی:** سیستم سالم است. مشکل سیستمی اصلی: **موبایل** (میانگین ۳.۲/۵) — جداول بدون scroll، گریدهای ثابت، و دکمه‌های بدون flex-wrap. ۵ معیار دیگر همه ۴.۴–۵.۰.
**بدترین صفحات:** سفارش خرید (4.2)، منو (4.2)، حقوق (4.3).
**بهترین:** ثبت تراکنش جدید و شرکا (5.0) — الگوی مرجع.
**Quick Wins:** ۱) overflow-x-auto برای ۹ جدول، ۲) responsive grid، ۳) flex-wrap دکمه‌ها.
**فایل‌ها:** `project-docs/INVESTIGATION-visual-audit.md` (جدید)
**Build:** بدون تغییر کد — فقط مستندسازی
**ناتمام:** —
**برای جلسه‌ی بعد:** تصمیم کاربر: آیا Quick Wins اجرا شوند؟ اگر بله، فاز ۹ — موبایل responsiveness.

## 📓 2026-07-12 — فاز ۸ — یکدستی بصری دکمه‌ها و inputها (v0.21.0) — اکانت ۱
**چه شد:** جایگزینی دکمه‌های `<button>` خام با `<Button>` استاندارد در ۴ صفحه کلیدی — طبق INVESTIGATION-accounting-model.md بخش ۶ (فاز D). هیچ تغییر رفتاری نداشت. تغییرات ظاهری محسوس:
- `transactions/new`: دکمه «انصراف» حالا همارتفاع با «ثبت تراکنش» (h-11 MD بجای h-10 خام).
- `cheques`: دکمه «چک جدید» حالا به رنگ accent آبی (بجای bg-text خاکستری تیره).
- `accounts/[id]`: دکمه «چاپ» حالا border خاکستری استاندارد دارد.
- `contacts`: input «نوع» در فرم افزودن حالا استایل Input کامپوننت دارد (border accent on focus).
**فایل‌ها:** `app/(app)/transactions/new/page.tsx`، `app/(app)/contacts/page.tsx`، `app/(app)/accounts/[id]/page.tsx`، `app/(app)/cheques/page.tsx`
**Build:** tsc ✅ ۰ خطا · build ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** DB migration بخش B (is_setup + opening_date) در pgAdmin. بعد P&L drilldown.

## 📓 2026-07-12 — حذف ابزار پاک‌سازی (v0.20.1) — اکانت ۱
**چه شد:** کاربر پاک‌سازی طرف‌حساب‌ها را انجام داد. طبق قرار، ابزار موقت حذف شد:
- `app/api/admin/contact-cleanup/` (کل دایرکتوری) حذف شد.
- `components/settings/ContactCleanupPane.tsx` حذف شد.
- `SettingsNav.tsx`: tab `contact-cleanup` و import `UserX` حذف شدند.
- `components/settings/index.ts`: export حذف شد.
- `app/(app)/settings/page.tsx`: import و render block حذف شدند.
**فایل‌ها:** ۵ فایل ویرایش، ۳ فایل حذف.
**Build:** tsc ✅ ۰ خطا · build ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** DB migration بخش B (is_setup + opening_date). بعد فاز ۸.

## 📓 2026-07-12 — Faz 7 — جریان یکپارچه چک↔طرف‌حساب↔تراکنش↔دسته (v0.20.0) — اکانت ۱
**چه شد:**
- **`contactId` به `TransactionBase`**: تایپ TypeScript حالا `contactId?: string | null` دارد — قبلاً API برمی‌گرداند ولی تایپ نداشت.
- **ContactLedgerDrawer — اقدامات سریع**: زیر بخش چک‌ها، دو دکمه‌ی لینک اضافه شد:
  - «ثبت تراکنش با این طرف‌حساب» → `/transactions/new?prefill_contactId=X` (pre-fill خودکار).
  - «ثبت / مشاهده چک‌ها» → `/cheques`.
  - Escape handler به capture phase منتقل شد تا اگر از داخل TxDetailPanel باز شود، Escape فقط drawer را ببندد نه TxDetailPanel را.
- **TxDetailPanel — لینک طرف‌حساب**: اگر تراکنش `contactId` داشته باشد، نام طرف‌حساب در بخش جزئیات به‌صورت کلیک‌پذیر نمایش می‌یابد (زیرخط‌دار). کلیک روی آن drawer طرف‌حساب را در همان صفحه تراکنش‌ها باز می‌کند.
- **transactions/page.tsx**: `ContactLedgerDrawer` اضافه شد. `onContactClick` به TxDetailPanel پاس می‌شود.
- **فرم ثبت تراکنش — `+ دسته‌ی جدید`**: دکمه‌ی `+` کنار select دسته‌بندی (فقط SuperAdmin). مودال کوچک inline — نام را می‌گیرد، POST `/api/categories` می‌زند (از طریق Zustand `createCategory`)، بعد از ساخت category جدید را auto-select می‌کند.
**فایل‌ها:** `types/transaction.ts`، `components/contacts/ContactLedgerDrawer.tsx`، `components/transactions/TxDetailPanel.tsx`، `app/(app)/transactions/page.tsx`، `app/(app)/transactions/new/page.tsx`
**Build:** tsc ✅ ۰ خطا · build ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** ۱) کاربر پاک‌سازی طرف‌حساب‌ها را انجام دهد → خبر دهد → commit جداگانه: فایل‌های پاک‌سازی حذف شوند. ۲) DB migration بخش B. ۳) فاز ۸ احتمالی: P&L drilldown.

## 📓 2026-07-12 — Faz 6 — ابزار پاک‌سازی طرف‌حساب (v0.19.0) — اکانت ۱
**چه شد:**
- **API تشخیصی**: `GET /api/admin/contact-cleanup` — query: نام | نوع | تعداد تراکنش | مانده | آخرین تراکنش (فقط contacts فعال).
- **API اقدام**: `POST /api/admin/contact-cleanup/[id]` با body `{action: 'delete'|'convert'}`:
  - `delete`: server-side تأیید linked_tx_count=0 و balance=0 → حذف + audit log.
  - `convert`: atomic transaction: ۱) categoryName خالی تراکنش‌های لینک‌شده = نام contact، ۲) contactId→NULL، ۳) contact غیرفعال، ۴) audit log.
- **UI**: `ContactCleanupPane` در Settings (superAdminOnly) — جدول با inline confirm. قوانین:
  - balance≠0 → قفل با tooltip «مانده نسیه دارد — اول تسویه».
  - linked=0 و balance=0 → فقط دکمه «حذف».
  - linked>0 و balance=0 → فقط دکمه «تبدیل به دسته».
  - «نگه‌دار» همیشه (بدون اقدام).
- هیچ مهاجرت خودکاری نه — همه با کلیک و confirm کاربر.
- ⚠ **قدم پایانی الزامی**: بعد از اتمام پاک‌سازی توسط کاربر، در commit جداگانه `ContactCleanupPane.tsx` + API routes آن (`/api/admin/contact-cleanup/`) حذف یا پشت `ENABLE_CONTACT_CLEANUP=true` env flag قرار گیرند تا ابزار خطرناک دائمی نشود.
**فایل‌ها:** `app/api/admin/contact-cleanup/route.ts` (جدید)، `app/api/admin/contact-cleanup/[id]/route.ts` (جدید)، `components/settings/ContactCleanupPane.tsx` (جدید)، `components/settings/SettingsNav.tsx`، `components/settings/index.ts`، `app/(app)/settings/page.tsx`
**Build:** tsc ✅ ۰ خطا · build ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** کاربر پاک‌سازی را انجام می‌دهد → خبر می‌دهد → commit جداگانه: فایل‌های پاک‌سازی حذف شوند.


