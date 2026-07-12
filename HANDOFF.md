# HANDOFF.md — دفتر وضعیت زنده‌ی پروژه «با شرف»

> این فایل **دفتر رله‌ی بین دو اکانت Claude Code** است که نوبتی روی همین پوشه کار می‌کنند.
> قانون طلایی: **هر جلسه اول بخش ۰ را بخوان؛ آخر جلسه بخش ۰ + ژورنال را به‌روز کن و commit/push کن.**
> جزئیات تاریخی قدیمی‌تر: `project-docs/handoff-archive.md`.

---

## ⚡ بخش ۰ — وضعیت لحظه‌ای (اول این را بخوان)

| | |
|---|---|
| **نسخه** | `0.21.0-visual-consistency` |
| **آخرین به‌روزرسانی** | 2026-07-12 — اکانت: ۱ |
| **Build/tsc** | tsc سبز ✅ (۰ خطا) · build ✅ |
| **دیپلوی** | ✅ GitHub Actions فعال. Branch: `main` — push شده. |
| **کار نیمه‌تمام (in-progress)** | — |
| **کار بعدی پیشنهادی** | P&L drilldown یا disconnect‌های حسابداری. دسته‌های راه‌اندازی را در UI علامت بزنید (Settings → دسته‌ها → آیکن Construction). |
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

## 📓 2026-07-12 — Faz 5 — لنز گزارش‌گیری «عملیاتی vs کامل» (v0.18.0) — اکانت ۱
**چه شد:**
- **فیلد `is_setup` روی categories**: schema + migration آماده (`db-setup-flag-migration.sql`). `Category` interface آپدیت شد. API `/categories/[id]` حالا `isSetup` را هم patch می‌کند.
- **فیلد `opening_date` روی branches**: schema + migration آماده. `Branch` interface + validation schema آپدیت شد. API `/branches/[id]` حالا `openingDate` را هم patch می‌کند.
- **repo/store layer**: `CategoriesRepo.update` signature عوض شد به `patch: {name?, isSetup?}`. `refsSlice.updateCategory` هم‌راستا شد. optimistic Category در `createCategory` حالا `isSetup: false` دارد.
- **Settings → دسته‌ها**: هر ردیف هزینه یک دکمه Construction دارد — toggle `isSetup` بدون modal. اگر فعال باشد برچسب «راه‌اندازی» نمایش داده می‌شود.
- **Settings → شعبه**: فیلد «تاریخ شروع بهره‌برداری» اختیاری در modal. در کارت شعبه نمایش داده می‌شود اگر ثبت شده باشد.
- **API گزارش‌ها**: `excludeSetup=1` → دسته‌های `is_setup=true` از جریان مالی حذف می‌شوند. `setupExcludedExpense` در `summary` برگشت داده می‌شود. from/to از Jalali string مستقیم ارسال می‌شود (bug fix — قبلاً `new Date(jalali).toISOString()` اشتباه بود).
- **`useDashboardMetrics`**: پارامتر `viewMode: 'operational'|'full'` دریافت می‌کند. دسته‌های `is_setup=true` از income/expense/balance و breakdown حذف می‌شوند. `setupExcludedExpense` در خروجی.
- **داشبورد**: toggle «عملیاتی | کامل» در header بخش تراز مالی. state در `localStorage['ba-view-mode']`. disclaimer زیر KPI‌ها اگر هزینه‌ی حذف‌شده > ۰.
- **صفحه گزارش‌ها**: همان toggle. دکمه «از افتتاح» فعال فقط اگر شعبه‌ی تکی انتخاب شده AND آن شعبه `openingDate` دارد. disclaimer زیر KPIها.
- ⚠ **INVARIANT حفظ شد**: `accounts.balance` (ترازنامه‌ای) هرگز توسط فیلتر `is_setup` تغییر نمی‌کند — فقط جریان‌های مالی (income/expense/profit) تحت تأثیرند.
**فایل‌ها:** `db/schema.ts`, `types/transaction.ts`, `types/branch.ts`, `lib/validations/settings.ts`, `app/api/categories/[id]/route.ts`, `app/api/branches/[id]/route.ts`, `app/api/reports/route.ts`, `lib/repos/types.ts`, `lib/repos/api.ts`, `store/slices/refsSlice.ts`, `lib/hooks/useDashboardMetrics.ts`, `components/settings/CategoriesPane.tsx`, `components/settings/BranchesPane.tsx`, `app/(app)/dashboard/page.tsx`, `app/(app)/reports/page.tsx`
**Build:** tsc ✅ ۰ خطا · build ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** ۱) کاربر `db-setup-flag-migration.sql` بخش B را در pgAdmin اجرا کند. ۲) دسته‌های راه‌اندازی را در UI علامت بزند. ۳) Faz 3 کد (partner_id واقعی).

## 📓 2026-07-12 — Faz 4 — بازطراحی فرم ثبت تراکنش (v0.17.0) — اکانت ۱
**چه شد:**
- **فرم `/transactions/new` بازطراحی شد**: ۵ فیلد اصلی همیشه نمایان (نوع، عنوان، مبلغ، دسته، حساب) + accordion «جزئیات بیشتر» برای ۷ فیلد فرعی (روش، طرف‌حساب، رسید، تاریخ، فاکتور، VAT، پیش‌فاکتور، یادداشت). state accordion در localStorage کلید `ba-tx-details-open`.
- **انتخاب سلسله‌مراتبی حساب**: accounts فیلتر می‌شوند به scope شعبه انتخابی (`branchId=null || branchId=selectedBranch`). اگر حساب‌های partner_equity وجود دارند → `<optgroup>` جداگانه «آورده شرکا» با پیشوند «آورده:».
- **pre-fill گسترش یافت**: پارامترهای `prefill_accountId` و `prefill_destAccountId` جدید اضافه شدند. اگر هر pre-fill پارامتری در URL بود → accordion خودکار باز می‌شود.
- **دکمه «ثبت آورده» در `/partners/[id]`**: به header کارت «آورده‌ی سرمایه» اضافه شد. نام شریک و ID حساب equity را در URL `/transactions/new` pre-fill می‌کند (با name-match fallback برای قبل از Faz 3 code).
- وقتی شعبه تغییر می‌کند، حساب‌های خارج از scope خودکار پاک می‌شوند.
**فایل‌ها:** `app/(app)/transactions/new/page.tsx` (بازنویسی کامل)، `app/(app)/partners/[id]/page.tsx` (دکمه ثبت آورده)
**Build:** tsc ✅ ۰ خطا · build ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** ۱) کاربر بخش A+B فایل `db-ownership-data-migration.sql` را در pgAdmin اجرا کند (نام شعبه تأیید → DO block اجرا). ۲) بعد از تأیید بخش C: **Faz 3 code** — `partnerId` به `accounts` در Drizzle schema اضافه، GET /api/accounts و GET /api/accounts/[id] مقدار واقعی برمی‌گردانند (به‌جای null hardcode). بعد از آن کارت آورده در `/partners/[id]` نمایش واقعی خواهد داشت.

## 📓 2026-07-11 — Faz 3 prep — SQL data migration + bugfix (v0.16.1) — اکانت ۱
**چه شد:**
- `db-ownership-data-migration.sql` ساخته شد: self-contained، بدون UUID دستی، idempotent.
  بخش A (SELECT تأییدی) → بخش B (DO block: get-or-insert partners، partner_branches، UPDATE accounts) → بخش C (SELECT نهایی).
  برای نام شعبه از subquery استفاده شد؛ اگر نام اشتباه باشد RAISE EXCEPTION می‌دهد.
- **bugfix**: POST /api/partners/[id]/branches — بررسی تکراری برای ستادی (branch_id=null) اشتباه بود:
  از `isNull(schema.partnerBranches.branchId)` استفاده شد.
- بررسی edge cases UI (بند ۳): همه حالت‌ها (قبل از migration، بعد از SQL، بعد از Faz3 code) gracefully handle می‌شوند.
**فایل‌ها:** `db-ownership-data-migration.sql` (جدید)، `app/api/partners/[id]/branches/route.ts`
**Build:** tsc ✅ ۰ خطا
**ناتمام:** —
**برای جلسه‌ی بعد:** کاربر بخش A فایل SQL را در pgAdmin اجرا می‌کند → نام دقیق شعبه را می‌بیند → اگر نام فرق دارد v_branch_name را در فایل ویرایش می‌کند → بخش B را اجرا می‌کند → خبر می‌دهد. بعد از تأیید بخش C: Faz 3 کد — partner_id به Drizzle schema accounts اضافه، API حساب‌ها partnerId واقعی برمی‌گرداند.

## 📓 2026-07-11 — مدل مالکیت: Faz 2 — UI شرکا (v0.16.0) — اکانت ۱
**چه شد:**
- مرحله ۱ SQL توسط کاربر در pgAdmin اجرا و تأیید شد (partners, partner_branches, ALTER accounts).
- **صفحه /partners**: لیست شرکا، فرم افزودن، جستجو، نمایش شعب هر شریک، لینک به پروفایل.
- **صفحه /partners/[id]**: ویرایش inline مشخصات، مدیریت رابطه شریک↔شعبه (افزودن با JalaliDatePicker + حذف نرم)، بخش آورده سرمایه (partner_equity accounts، برچسب «آورده‌ی خرج‌شده» برای منفی).
- **API**: POST/DELETE /api/partners/[id]/branches با bررسی تکراری و partial uniqueness.
- **store/slices/partnersSlice.ts**: addPartnerBranch، removePartnerBranch اضافه شد.
- **accounts page**: grouping (عملیاتی vs آورده شرکا)، totalBalance بدون equity، کارت جداگانه equity با برچسب.
- **dashboard**: بخش «وضعیت شرکا» از partners API (نه contacts)؛ اگر خالی = یک‌خطه.
- **nav-config**: آیتم «شرکا» با Handshake در «روابط و منابع» اضافه شد.
**فایل‌ها:** `app/(app)/partners/page.tsx`، `app/(app)/partners/[id]/page.tsx`، `app/(app)/partners/layout.tsx`، `app/api/partners/[id]/branches/route.ts`، `app/api/partners/[id]/branches/[pbId]/route.ts`، `app/(app)/accounts/page.tsx`، `app/(app)/dashboard/page.tsx`، `components/layout/nav-config.ts`، `store/slices/partnersSlice.ts`، `app/api/partners/route.ts`
**Build:** tsc ✅ ۰ خطا · build ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** ⚠️ مرحله ۳ SQL (data migration): درج حسین شرف + شهریار شرف در partners، درج partner_branches، UPDATE accounts.type='partner_equity' + accounts.partner_id. UUID‌ها باید از DB واقعی گرفته شوند. بعد از مرحله ۳: Faz 3 — partner_id به Drizzle schema اضافه می‌شود و API حساب‌ها partnerId واقعی برمی‌گرداند.

## 📓 2026-07-11 — مدل مالکیت: Faz 0+1 (v0.15.0) — اکانت ۱
**چه شد:**
1. **Faz 0 — SQL migration**: `db-ownership-model-migration.sql` ساخته شد. مرحله ۱: جدول `partners`، جدول `partner_branches` با دو partial unique index (حل مشکل NULL uniqueness در PostgreSQL)، ستون `partner_id` nullable روی `accounts`. مرحله ۳ کامنت‌شده برای اجرای بعد از deploy.
2. **Faz 1 — کد**:
   - `lib/db/schema.ts`: جداول `partners` و `partnerBranches` با relations اضافه شد (partner_id روی accounts اضافه نشد — backward compat)
   - `types/partner.ts`: Partner, PartnerBranchAssoc (فایل جدید)
   - `Account.partnerId: string | null` اضافه شد (همه‌جا null تا Faz 3)
   - `app/api/partners/route.ts`: GET+POST (requireAdmin)
   - `app/api/partners/[id]/route.ts`: PATCH+DELETE (soft)
   - accounts API: 'partner_equity' به enum اضافه شد
   - `store/slices/partnersSlice.ts`: loadPartners, createPartner, updatePartner, deletePartner
   - `store/index.ts`: PartnersSlice اضافه شد
3. tsc ✅ ۰ خطا · build ✅ · دو commit جداگانه push شد.
**فایل‌ها:** `db-ownership-model-migration.sql`، `lib/db/schema.ts`، `types/partner.ts`، `types/transaction.ts`، `types/index.ts`، `app/api/partners/route.ts`، `app/api/partners/[id]/route.ts`، `app/api/accounts/route.ts`، `app/api/accounts/[id]/route.ts`، `store/slices/partnersSlice.ts`، `store/index.ts`، `store/slices/accountsSlice.ts`، `lib/realtime/useRealtime.ts`
**Build:** tsc ✅ ۰ خطا · build ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** ⚠️ کاربر باید مرحله ۱ SQL را در pgAdmin اجرا کند (فایل `db-ownership-model-migration.sql`، فقط تا خط `END $$;` — مرحله ۳ هنوز نه). بعد از تأیید: Faz 2 = صفحه‌ی شرکا در `/settings` یا صفحه‌ی مستقل، جایگزینی type='cash' به 'partner_equity'، فیلتر حساب‌های شریک در فرم تراکنش.

## 📓 2026-07-11 — نمودارهای واقعی داشبورد (v0.14.0) — اکانت ۱
**چه شد:** فاز dataviz — ۴ commit روی `feat/dashboard-dataviz` سپس merge به main:
1. **API `/api/dashboard/trends`**: یک query `GROUP BY date` روی تراکنش‌های ۱۴ روز اخیر (createdAt). برمی‌گرداند `{days, todayIncome, todayExpense}`. حداکثر ۲ query جدید در کل فاز — این اولی و تنهاست.
2. **TrendChart**: recharts BarChart دوسری (income=emerald, expense=rose). محور Y سمت راست. tooltip فارسی با formatMoneyShort و تاریخ جلالی. قانون: <3 روز داده → null.
3. **TodayCashFlow**: دو کارت کوچک ورودی/خروجی امروز از همان endpoint. اگر هر دو صفر → null.
4. **BreakdownCard**: formatMoneyShort رنگی به‌جای fmt، top-5، bar 5px. **BranchSummary**: جدول متنی → دو bar افقی نسبی (incW/expW نسبت به max). موجودی بالای ردیف.
**فایل‌ها:** `app/api/dashboard/trends/route.ts` (جدید)، `components/dashboard/TrendChart.tsx` (جدید)، `components/dashboard/TodayCashFlow.tsx` (جدید)، `components/dashboard/index.ts`، `components/dashboard/BreakdownCard.tsx`، `components/dashboard/BranchSummary.tsx`، `app/(app)/dashboard/page.tsx`
**Build:** tsc ✅ ۰ خطا · build ✅ · 48 unit tests ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** تست دستی با داده‌ی واقعی. TrendChart فقط اگر ≥۳ روز داشته باشد render شود (وگرنه null). tooltip hover/tap روی موبایل بررسی شود.


