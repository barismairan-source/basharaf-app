# HANDOFF.md — دفتر وضعیت زنده‌ی پروژه «با شرف»

> این فایل **دفتر رله‌ی بین دو اکانت Claude Code** است که نوبتی روی همین پوشه کار می‌کنند.
> قانون طلایی: **هر جلسه اول بخش ۰ را بخوان؛ آخر جلسه بخش ۰ + ژورنال را به‌روز کن و commit/push کن.**
> جزئیات تاریخی قدیمی‌تر: `project-docs/handoff-archive.md` (اگر نبود، اولین جلسه بسازد).

---

## ⚡ بخش ۰ — وضعیت لحظه‌ای (اول این را بخوان)

| | |
|---|---|
| **نسخه** | `0.9.36-theme-accent` |
| **آخرین به‌روزرسانی** | 2026-06-26 — اکانت: ۱ |
| **Build/tsc** | tsc سبز ✅ (۰ خطا) · build ✅ سبز · tests ✅ 32/32 |
| **دیپلوی** | ✅ **GitHub Actions فعال** — هر push به main خودکار deploy می‌شود (`basharaff` روی لیارا). 🟡 ولی **۴ migration** هنوز باید دستی در pgAdmin اجرا شود: `db-accounting-v1-migration.sql`، `db-admin-migration.sql`، `db-notifications-v2-migration.sql`، `db-financial-periods-migration.sql`. |
| **کار نیمه‌تمام (in-progress)** | — |
| **کار بعدی پیشنهادی** | (۱) اجرای ۴ migration در pgAdmin. (۲) تست Excel import با فایل واقعی پس از deploy. |
| **بلاک‌شده/منتظر کاربر** | تأیید migration و دیپلوی |

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

## 📓 ژورنال نشست‌ها (جدیدترین بالا — حداکثر ۷ ورودی)

## 📓 2026-06-26 — فیکس db-admin-migration.sql — اکانت ۱
**چه شد:** در شروع جلسه مشخص شد `db-admin-migration.sql` به‌اشتباه با محتوای `db-financial-periods-migration.sql` جایگزین شده بود (محتوای تکراری جدول financial_periods). migration اصلی (اضافه‌کردن ستون `is_active` به جدول `users` — Super Admin Panel v1) حذف شده بود. با `git checkout -- db-admin-migration.sql` فایل به وضعیت committed صحیح برگشت.
**فایل‌ها:** `db-admin-migration.sql` (revert)، `HANDOFF.md`.
**Build:** بدون تغییر کد — tsc/build/tests همچنان ✅ 32/32.
**ناتمام:** —
**برای جلسه‌ی بعد:** (۱) اجرای ۴ migration در pgAdmin. (۲) تست Excel import با فایل واقعی پس از deploy.

## 📓 2026-06-24 — CI/CD + بازطراحی apply + فیکس ThemeProvider crash — اکانت ۱
**چه شد:**
(۱) **GitHub Actions راه‌اندازی شد:** کاربر `.github/workflows/liara.yml` و `LIARA_API_TOKEN` secret را تنظیم کرد. از این به بعد هر push به main → لیارا خودکار deploy می‌کند (نام اپ: `basharaff`). دیگر ZIP لازم نیست.
(۲) **بازطراحی `app/apply/page.tsx`:** تمام منطق/state/validation/API حفظ شد، فقط JSX بازنویسی شد. Layout جدید: دو ستون (sidebar مشکی ۲۶۰px + فرم سفید) روی دسکتاپ، progress bar 3px روی موبایل. مرحله ۰: کارت‌های کلیک‌مستقیم. موفقیت: صفحه‌ی کامل مشکی با کارت سفید.
(۳) **فیکس ThemeProvider crash:** کاربرانی که localStorage قدیمی (بدون `accentColor`) داشتند، خطای `Cannot read properties of undefined (reading 'trim')` می‌گرفتند. guard `typeof` اضافه شد با fallback به `'#2563eb'`.
**فایل‌ها:** `app/apply/page.tsx`، `components/ui/ThemeProvider.tsx`، `components/settings/PreferencesPane.tsx`، `HANDOFF.md`.
**Build:** tsc ✅ · build ✅ · tests 32/32 ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** (۱) اجرای ۴ migration در pgAdmin (اگر هنوز نشده). (۲) تست Excel import با فایل واقعی. دیگر zip نساز — فقط push.

## 📓 2026-06-23 — v0.9.36: رنگ جانبی دینامیک + فیکس login loop + فیکس rolldown — اکانت ۱
**چه شد:**
(۱) **فیکس deploy (rolldown):** `@rolldown/binding-darwin-arm64` اشتباهاً به عنوان devDependency صریح در `package.json` ثبت شده بود. روی Linux x64 لیارا با `EBADPLATFORM` fail می‌کرد. حذف شد + lockfile rebuild.
(۲) **فیکس login reload loop:** `SessionSync` در root layout روی همه صفحات اجرا می‌شود. وقتی `bootstrap()` روی `/login` اجرا می‌شد، 401 از `/api/auth/me` می‌گرفت و بدون چک pathname، `window.location.replace('/login')` صدا می‌زد → reload بی‌نهایت. فیکس: guard مشابه `apiFetch` و `installSessionExpiryInterceptor` اضافه شد (`!isAuthRoute` چک).
(۳) **فیچر رنگ جانبی دینامیک:** `AccentColor` از union ثابت به `string` (hex) تغییر کرد. `ThemeProvider` هر hex رو می‌گیره و `--accent`/`--accent-subtle`/`--accent-hover` رو روی `:root` set می‌کنه. hover/subtle خودکار از luminance محاسبه می‌شوند (رنگ‌های تیره مثل مشکی → روشن‌تر hover؛ بقیه → تیره‌تر). Tailwind tokens.ts به `var(--accent)` و `var(--accent-subtle)` تبدیل شد. تنظیمات > تنظیمات نمایش: ۱۰ preset رنگ + چرخ رنگ بومی + ورودی hex + پیش‌نمایش زنده.
**فایل‌ها:** `package.json`، `package-lock.json`، `store/index.ts` (login loop fix)، `types/preferences.ts`، `types/index.ts`، `lib/design/tokens.ts`، `app/globals.css`، `app/layout.tsx`، `components/ui/Button.tsx`، `components/ui/ThemeProvider.tsx` (جدید)، `components/ui/index.ts`، `components/settings/PreferencesPane.tsx`.
**Build:** tsc ✅ · build ✅ · tests 32/32 ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** (۱) اجرای ۴ migration در pgAdmin. (۲) دیپلوی `basharaf-v0.9.36-liara.zip`. (۳) تست رنگ جانبی در تنظیمات > تنظیمات نمایش. (۴) تست Excel import با فایل واقعی.

## 📓 2026-06-23 — v0.9.35: UI مدیریت دوره‌های مالی — اکانت ۱
**چه شد:**
صفحه‌ی `/admin/settings/financial-periods` برای SuperAdmin ساخته شد. این صفحه API از پیش موجود `GET/POST/DELETE /api/financial-periods` را مصرف می‌کند.
قابلیت‌ها: (۱) لیست دوره‌های بسته‌شده به‌صورت معکوس زمانی با تاریخ بستن. (۲) فرم بستن دوره جدید (سال ۱۴۰۰–۱۴۱۰ + ماه dropdown + دکمه‌ی قرمز). (۳) دکمه‌ی «بازگشایی» با confirm dialog که DELETE می‌زند. (۴) کارت هشدار amber توضیح اثر قفل. (۵) تشخیص خودکار ماه/سال جاری از `getTodayJalali()` با تبدیل ارقام فارسی: `c.charCodeAt(0) - 0x06F0`. تم dark admin (stone-950/900/800/700). همچنین `AdminSidebar.tsx` با آیکون `CalendarDays` به‌روز شد.
ZIP نیز rebuild شد: `basharaf-v0.9.35-liara.zip` (1.4MB).
**فایل‌ها:** `app/(admin)/admin/settings/financial-periods/page.tsx` (جدید)، `components/admin/AdminSidebar.tsx` (ویرایش).
**Build:** tsc ✅ · build ✅ · tests 32/32 ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** (۱) اجرای ۴ migration در pgAdmin. (۲) دیپلوی `basharaf-v0.9.35-liara.zip`. (۳) تست Excel import با فایل واقعی پس از deploy.

## 📓 2026-06-23 — v0.9.34: Excel Bulk Import + 3-Tier BOM — اکانت ۱
**چه شد:**
فیچر «ایمپورت رسپی از Excel» با معماری ۳ لایه‌ی BOM پیاده‌سازی شد:
(۱) **API — `POST /api/inventory/recipes/import`:** فایل `.xlsx/.xls` را در `multipart/form-data` می‌گیرد. سه شیت الزامی (`۱_مواد خام`، `۲_زیررسپی`، `۳_پرس نهایی`) را parse می‌کند. تمام عملیات درون یک `db.transaction` اتمیک است. شیت ۱ مواد خام را در `invItems (kind='raw')` upsert می‌کند و `avgCostPerBase` را از «قیمت خرید ÷ basePerUnit» محاسبه می‌کند. شیت ۲ نیمه‌آماده‌ها را در `invItems (kind='prep')` upsert می‌کند و `prepRecipe` JSON و `batchYieldBase` را می‌نویسد. شیت ۳ رسپی‌های نهایی را در `invRecipes + invRecipeLines` upsert می‌کند و به‌صورت خودکار با `menuItems.titleFa` لینک می‌زند. خطاهای validation (واحد نامعتبر، ماده ناشناخته، رسپی بدون ماده) با row/sheet دقیق برمی‌گرداند.
(۲) **Template — `GET /api/inventory/recipes/import/template`:** فایل Excel الگو را با سه شیت و ردیف‌های نمونه on-the-fly تولید می‌کند.
(۳) **UI — `ImportExcelModal`:** دکمه «ایمپورت Excel» در header صفحه رسپی‌ها. Modal با drag-and-drop dropzone، دانلود template، نمایش progress، و خلاصه‌ی نتیجه (۴ کارت).
**فایل‌ها:** `app/api/inventory/recipes/import/route.ts` (جدید)، `app/api/inventory/recipes/import/template/route.ts` (جدید)، `app/(app)/inventory/recipes/page.tsx` (ImportExcelModal + دکمه جدید).
**Build:** tsc ✅ · build ✅ · tests 32/32 ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** (۱) اجرای ۴ migration در pgAdmin. (۲) دیپلوی `basharaf-v0.9.34-liara.zip`. (۳) تست import با فایل Excel واقعی. (۴) UI مدیریت دوره‌های مالی.

## 📓 2026-06-22 — مرتب‌سازی root + zip درست برای Liara — اکانت ۱
**چه شد:**
root پروژه که بسیار شلوغ شده بود پاکسازی شد: ۳۵ فایل SQL قدیمی (همه‌ی supabase-* و db-* که قبلاً deploy شده بودند) با `git mv` به `project-docs/migrations/` منتقل شدند. ۴ فایل doc سرگردان (`DEPLOY.md`، `DEPLOY-LIARA.md`، `final-status.md`، `deployment-summary.md`) به `project-docs/` رفتند. ۱۹ zip قدیمی در root حذف شدند (در gitignore بودند، tracked نبودند). zip جدید `basharaf-v0.9.33-liara.zip` با exclude کامل ساخته شد (snapshot dirs، tests، .claude، graphify-out، release-artifacts) — حجم از ۴MB به ۱.۴MB کاهش یافت.
**فایل‌ها:** `project-docs/migrations/` (جدید)، `project-docs/` (4 doc)، `HANDOFF.md`.
**Build:** tsc ✅ · build ✅ · tests 32/32 ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** (۱) اجرای ۴ migration در pgAdmin. (۲) آپلود `basharaf-v0.9.33-liara.zip` روی Liara. (۳) UI مدیریت دوره‌های مالی.

## 📓 2026-06-21 — v0.9.33: Core Financial Integrity Sprint (Phase 1+2+3) — اکانت ۲
**چه شد:**
سپرینت یکپارچگی مالی در سه فاز کامل شد:
(۱) **Phase 1 — Migration Infrastructure:** `lib/db/migrate.ts` ساخته شد — اجرای خودکار Drizzle migration‌ها روی production (دستور `npm run db:migrate`).
(۲) **Phase 2 — Financial Period Close (قفل دوره مالی):** جدول `financial_periods` به `schema.ts` اضافه شد (jalali_year + jalali_month، UNIQUE constraint). `lib/financial-period.ts` helper ساخته شد با `parseJalaliYearMonth()` و `isDateInClosedPeriod()` (از ارقام فارسی/ASCII پشتیبانی می‌کند). API `GET/POST/DELETE /api/financial-periods` برای SuperAdmin. گارد مسدودکننده در `PATCH` و `DELETE` تراکنش‌ها: هر تغییر/حذف تراکنش approved در دوره‌ی بسته → خطای 422 غیرقابل‌عبور. Migration: `db-financial-periods-migration.sql`.
(۳) **Phase 3 — Unit Tests:** Vitest نصب شد (v2.1.9 + `vitest.config.ts`). دو ماژول pure math استخراج شد: `lib/financial/balance.ts` (applyDelta/reverseDelta) و `lib/financial/vat.ts` (lineVat/orderVat). سه مجموعه تست: `tests/unit/balance.test.ts` (11 test)، `tests/unit/costing.test.ts` (11 test)، `tests/unit/vat.test.ts` (10 test) — جمعاً 32/32 پاس.
همچنین `db-admin-migration.sql` که اتفاقاً خالی شده بود بازیابی شد.
**فایل‌ها:** `lib/db/schema.ts` (financialPeriods table)، `lib/db/migrate.ts` (جدید)، `lib/financial-period.ts` (جدید)، `lib/financial/balance.ts` (جدید)، `lib/financial/vat.ts` (جدید)، `app/api/financial-periods/route.ts` (جدید)، `app/api/transactions/[id]/route.ts` (guard اضافه شد)، `db-financial-periods-migration.sql` (جدید)، `tests/unit/*.test.ts` (جدید)، `vitest.config.ts` (جدید)، `package.json`.
**Build:** `npx tsc --noEmit` ✅ ۰ خطا. `npm run build` ✅ سبز. `npm test` ✅ 32/32.
**ناتمام:** —
**برای جلسه‌ی بعد:** (۱) اجرای `db-financial-periods-migration.sql` (+ سه migration قبلی اگر نشده) در pgAdmin. (۲) دیپلوی zip. (۳) UI مدیریت دوره‌های مالی در settings یا admin panel.


