# HANDOFF.md — دفتر وضعیت زنده‌ی پروژه «با شرف»

> این فایل **دفتر رله‌ی بین دو اکانت Claude Code** است که نوبتی روی همین پوشه کار می‌کنند.
> قانون طلایی: **هر جلسه اول بخش ۰ را بخوان؛ آخر جلسه بخش ۰ + ژورنال را به‌روز کن و commit/push کن.**
> جزئیات تاریخی قدیمی‌تر: `project-docs/handoff-archive.md` (اگر نبود، اولین جلسه بسازد).

---

## ⚡ بخش ۰ — وضعیت لحظه‌ای (اول این را بخوان)

| | |
|---|---|
| **نسخه** | `0.9.33-financial-integrity` |
| **آخرین به‌روزرسانی** | 2026-06-22 — اکانت: ۱ |
| **Build/tsc** | tsc سبز ✅ (۰ خطا) · build ✅ سبز · tests ✅ 32/32 |
| **دیپلوی** | 🟡 **چهار migration** لازم دارد: `db-accounting-v1-migration.sql`، `db-admin-migration.sql`، `db-notifications-v2-migration.sql`، و **`db-financial-periods-migration.sql` (جدید)** — همه در pgAdmin روی Liara اجرا شوند. ZIP: `basharaf-v0.9.33-liara.zip` (1.4MB) آماده است. |
| **کار نیمه‌تمام (in-progress)** | — |
| **کار بعدی پیشنهادی** | (۱) اجرای هر چهار migration در pgAdmin. (۲) دیپلوی `basharaf-v0.9.33-liara.zip` روی Liara. (۳) UI مدیریت دوره‌های مالی (`/admin/settings/financial-periods`). |
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

## 📓 2026-06-20 — v0.9.32: سیستم اعلان نسل ۲ — اکانت ۲
**چه شد:**
بازسازی کامل سیستم اعلان در ۴ فاز:
(۱) **فاز ۱ — Schema/DB:** `notifTypeEnum` به `warning` و `critical` گسترش یافت. ستون‌های `action_url` و `entity_id` به جدول `notifications` اضافه شد. جدول `notification_rules` (key/label/enabled/threshold) برای کنترل ادمین ساخته شد. Migration: `db-notifications-v2-migration.sql`. `lib/notify.ts` helper مرکزی با `notify()`, `notifyAdmins()`, `getRuleThreshold()` ساخته شد.
(۲) **فاز ۲ — UI Bell:** `NotificationsBell.tsx` کاملاً بازنویسی شد. Desktop: dropdown 360px با TYPE_META برای ۶ نوع. Mobile: bottom sheet (max-h-75vh، animate-slide-up، backdrop-blur). Deep linking: کارت‌های با `actionUrl` به `<Link>` تبدیل شدند.
(۳) **فاز ۳ — Admin Config:** صفحه‌ی `/admin/settings/notifications` با toggle سوئیچ برای ۶ قانون. API `GET/PATCH /api/admin/notification-rules`. آیتم جدید در `AdminSidebar`.
(۴) **فاز ۴ — Wire-up:** همه ۶ call-site به `notify()`/`notifyAdmins()` migrate شدند: `lib/inventory/pendingNotifications.ts`، `lib/inventory/inventoryWarnings.ts`، `transactions/approve`، `transactions/reject`، `inventory/vouchers/approve`، `inventory/vouchers/reject`، `inventory/vouchers/import`، `purchase-orders/receive`. GET handler مربوط به notifications بروز شد تا `actionUrl` و `entityId` را هم بازگرداند. `lib/realtime/useRealtime.ts` با فیلدهای جدید بروز شد.
**فایل‌ها:** `lib/db/schema.ts`، `lib/notify.ts` (جدید)، `db-notifications-v2-migration.sql` (جدید)، `types/notification.ts`، `components/layout/NotificationsBell.tsx`، `components/admin/AdminSidebar.tsx`، `app/api/admin/notification-rules/route.ts` (جدید)، `app/(admin)/admin/settings/notifications/page.tsx` (جدید)، `lib/inventory/pendingNotifications.ts`، `lib/inventory/inventoryWarnings.ts`، `app/api/transactions/[id]/approve/route.ts`، `app/api/transactions/[id]/reject/route.ts`، `app/api/inventory/vouchers/[id]/approve/route.ts`، `app/api/inventory/vouchers/[id]/reject/route.ts`، `app/api/inventory/vouchers/import/route.ts`، `app/api/purchase-orders/[id]/receive/route.ts`، `app/api/notifications/route.ts`، `lib/realtime/useRealtime.ts`.
**Build:** `npx tsc --noEmit` ✅ ۰ خطا. `npm run build` ✅ سبز.
**ناتمام:** —
**برای جلسه‌ی بعد:** (۱) اجرای `db-notifications-v2-migration.sql` در pgAdmin (همراه با دو migration قبلی اگر نشده). (۲) دیپلوی zip. (۳) تست: approve تراکنش → اعلان در Bell → کلیک → deep link به `/transactions`.

## 📓 2026-06-20 — v0.9.31: Enterprise UX (Skeleton primitive + 11 loading.tsx + API error unification) — اکانت ۲
**چه شد:**
(۱) **Skeleton UI Primitive:** `components/ui/Skeleton.tsx` ساخته شد — یک سیستم کامپوزبل با sub-components: `Line`، `Card`، `TableRow`، `Table`، `Toolbar`، `Metric`، `Chart`، `Avatar`، `PageHeader`، `ActionCard`، `Dark`، `DarkTable`. به `components/ui/index.ts` export شد.
(۲) **11 فایل loading.tsx جدید:** هر صفحه‌ی سنگین یک skeleton دقیق دارد که layout واقعی را mirror می‌کند (CLS = صفر):
  - `app/(app)/loading.tsx` — ارتقا داده شد (از blob به Skeleton primitive)
  - `app/(app)/transactions/loading.tsx` — KPI + filter + جدول ۱۰ ردیفی
  - `app/(app)/contacts/loading.tsx` — toolbar + جدول
  - `app/(app)/accounts/loading.tsx` — ۳ کارت نوع حساب + جدول
  - `app/(app)/reports/loading.tsx` — filter card + ۴ KPI + ۲ چارت + جدول
  - `app/(app)/inventory/loading.tsx` — action cards + more actions list
  - `app/(app)/purchase-orders/loading.tsx` — toolbar + جدول
  - `app/(app)/recruitment/loading.tsx` — kanban board با ۴ ستون
  - `app/(app)/logs/loading.tsx` — level tabs + log entries
  - `app/(admin)/loading.tsx` — dark theme با DarkTable
  - `app/(admin)/admin/users/loading.tsx` — dark theme کاربران
  - `app/(admin)/admin/audit/loading.tsx` — dark theme audit + pagination
(۳) **API Error Unification (7 route):** customer/addresses، customer/addresses/[id]، customer/auth/send-otp، customer/auth/verify، customer/me، customer/orders، auth/permissions — همه migrate شدند به `handleError()` از `lib/api-error.ts`. دیگر هیچ `console.error + خطای سرور raw` در پروژه نیست.
(۴) **کدهای اقدامی تمیز شدند:** `ApiError` در جاهایی که response.json مستقیم داشتند جایگزین شد.
**فایل‌ها:** `components/ui/Skeleton.tsx`، `components/ui/index.ts`، ۱۱ فایل loading.tsx، ۷ API route (customer/*, auth/permissions)، `package.json`، `HANDOFF.md`.
**Build:** `npx tsc --noEmit` ✅ ۰ خطا. `npm run build` ✅ سبز.
**ناتمام:** —
**برای جلسه‌ی بعد:** (۱) اجرای migration در pgAdmin. (۲) دیپلوی zip روی Liara. (۳) تست skeleton‌ها روی مرورگر.

## 📓 2026-06-20 — v0.9.30: Phase A کامل (Bug1: SecurityPane labels + Bug2: invoiceCode/proforma در فرم تراکنش) — اکانت ۲
**چه شد:**
(۱) **Bug 1 (SecurityPane):** برچسب و آیکون همه‌ی AuditAction‌های جدید (۴۳ ورودی) به `ACTION_META` در `components/settings/SecurityPane.tsx` اضافه شد. آیکون‌های lucide جدید: Package، RefreshCw، RotateCcw، UserX، UserCheck، Users، DollarSign، Wrench، ClipboardCheck، ClipboardList، ShoppingCart، UserCog، Eye، EyeOff، Star، StarOff.
(۲) **Bug 2 (فرم تراکنش جدید):** فیلد «کد فاکتور» و چک‌باکس «پیش‌فاکتور» (amber، فقط SuperAdmin) به `app/(app)/transactions/new/page.tsx` اضافه شدند. state‌ها `invoiceCode` و `isProforma` اضافه شدند. منطق submit به‌روز شد: `initialStatus` بر اساس نقش و `isProforma` تعیین می‌شود.
(۳) **TS Fix:** `TransactionInput` در `types/transaction.ts` دو فیلد `invoiceCode?: string | null` و `initialStatus?: 'pending' | 'proforma'` گرفت — خطای `TS2353` برطرف شد.
(۴) **نکته حیاتی:** پیش‌فاکتور هیچ اثری روی موجودی ندارد — `createExpenseTx.ts` این را تضمین می‌کند.
**فایل‌ها:** `types/transaction.ts`، `components/settings/SecurityPane.tsx`، `app/(app)/transactions/new/page.tsx`، `package.json`.
**Build:** `npx tsc --noEmit` ✅ ۰ خطا. `npm run build` ✅ سبز.
**ناتمام:** —
**برای جلسه‌ی بعد:** (۱) اجرای هر دو migration در pgAdmin. (۲) ساخت zip و دیپلوی روی Liara. (۳) تست کامل admin panel + فرم تراکنش.

## 📓 2026-06-20 — v0.9.29: Super Admin Panel v1 (RBAC + Impersonation + Audit) — اکانت ۲
**چه شد:**
(۱) **Schema:** فیلد `is_active BOOLEAN DEFAULT TRUE` به جدول `users` اضافه شد (`lib/db/schema.ts`). Migration idempotent: `db-admin-migration.sql`.
(۲) **Auth Layer:** `lib/auth/jwt.ts` — `impersonatedBy?` به `JWTPayload` اضافه شد. `lib/auth/impersonation.ts` ساخته شد: `signImpersonationToken`، `verifyImpersonationToken`، `getImpersonationSession`، `setImpersonationSession`، `clearImpersonationSession` با کوکی `basharaf-imp` (4h, httpOnly). `lib/auth/session.ts` — `getServerSession()` حالا `basharaf-imp` را اول بررسی می‌کند؛ `requireAdmin()` به `getRealAdminSession()` مستقیم می‌رود (ادمین در حین جعل هویت هم به `/admin` دسترسی دارد)؛ `requirePermission()` اضافه شد.
(۳) **Middleware:** `/admin` به `PROTECTED_PREFIXES` اضافه شد؛ گارد اضافه: فقط `role === 'SuperAdmin'` می‌تواند `/admin` را ببیند.
(۴) **API Routes:** `POST /api/admin/impersonate` (start — AuditLog می‌نویسد)؛ `POST /api/admin/impersonate/end` (end — AuditLog می‌نویسد)؛ `GET /api/admin/users` (لیست کامل با isActive)؛ `PATCH /api/admin/users/[id]` (تغییر isActive/role/branch + AuditLog)؛ `GET /api/admin/audit` (pagination + filter).
(۵) **UI:** پنل تاریک (`bg-stone-950`) با layout مستقل `app/(admin)/`. صفحات: داشبورد ادمین، مدیریت کاربران (تعلیق + جعل هویت)، لاگ ادیت. بنر قرمز ثابت `z-50` روی تمام صفحات اپ در حین جعل هویت (`ImpersonationBanner` server component).
(۶) **تضمین‌های امنیتی:** فقط SuperAdmin می‌تواند جعل هویت کند؛ هر شروع/پایان در AuditLog ثبت می‌شود؛ `basharaf-session` اصلی هرگز دست نمی‌خورد؛ token جعل هویت ۴ ساعته است.
**فایل‌ها:** `lib/db/schema.ts`، `lib/auth/jwt.ts`، `lib/auth/audit.ts`، `lib/auth/impersonation.ts`، `lib/auth/session.ts`، `middleware.ts`، `types/user.ts`، `app/api/users/route.ts`، `app/api/admin/users/route.ts`، `app/api/admin/users/[id]/route.ts`، `app/api/admin/impersonate/route.ts`، `app/api/admin/impersonate/end/route.ts`، `app/api/admin/audit/route.ts`، `components/admin/AdminTable.tsx`، `components/admin/AdminSidebar.tsx`، `components/admin/ImpersonationBanner.tsx`، `components/admin/ImpersonationBannerClient.tsx`، `app/(admin)/layout.tsx`، `app/(admin)/admin/page.tsx`، `app/(admin)/admin/users/page.tsx`، `app/(admin)/admin/audit/page.tsx`، `app/(app)/layout.tsx`، `db-admin-migration.sql`، `package.json`.
**Build:** `npx tsc --noEmit` ✅ ۰ خطا. `npm run build` ✅ سبز.
**ناتمام:** —
**برای جلسه‌ی بعد:** (۱) اجرای `db-admin-migration.sql` در pgAdmin. (۲) دیپلوی. (۳) ورود SuperAdmin → `/admin` → تست جعل هویت و لاگ.

## 📓 2026-06-19 — v0.9.28: Accounting Overhaul v1 (proforma + invoiceCode + contact ledger) — اکانت ۲
**چه شد:**
(۱) **Phase 1 — Schema:** `proforma` به `txStatusEnum` اضافه شد. فیلد `invoice_code TEXT` به جدول `transactions` اضافه شد. فایل `db-accounting-v1-migration.sql` برای pgAdmin/Liara آماده شد (idempotent). `serializers.ts`، `types/transaction.ts`، `lib/colors.ts`، `RecentList.tsx` به‌روز شدند تا `proforma` را بشناسند.
(۲) **Phase 2 — Ledger Utility:** `lib/db/contactLedger.ts` ساخته شد: `calculateContactBalance(id)` (dynamic از approved txها) و `getContactLedger(id)` (تمام تراکنش‌های نسیه). API endpoint جدید: `GET /api/contacts/[id]/ledger`.
(۳) **Phase 3 — Contacts UI:** ردیف‌های صفحه طرف‌حساب‌ها کلیک‌پذیر شدند. `ContactLedgerDrawer` ساخته شد: drawer سمت راست با مانده‌ی پویا + تاریخچه تراکنش‌ها + دکمه چاپ.
(۴) **Phase 4 — Transactions UI:** `StatusPill` برای `proforma` (amber) به‌روز شد. `invoiceCode` در زیر عنوان هر تراکنش نمایش داده می‌شود. فیلتر وضعیت «پیش‌فاکتور» اضافه شد.
(۵) **نکته حیاتی:** پیش‌فاکتور هیچ اثری روی موجودی صندوق یا طرف‌حساب ندارد — حتی اگر SuperAdmin آن را ثبت کند. فقط approve صریح از `pending/proforma` → `approved` اثر مالی می‌گذارد.
**فایل‌ها:** `lib/db/schema.ts`, `lib/db/serializers.ts`, `lib/db/createExpenseTx.ts`, `lib/db/contactLedger.ts`, `lib/colors.ts`, `types/transaction.ts`, `lib/realtime/useRealtime.ts`, `components/ui/StatusPill.tsx`, `components/dashboard/RecentList.tsx`, `components/transactions/TxDetailPanel.tsx`, `components/contacts/ContactLedgerDrawer.tsx`, `app/(app)/contacts/page.tsx`, `app/(app)/transactions/page.tsx`, `app/api/transactions/route.ts`, `app/api/transactions/[id]/approve/route.ts`, `app/api/contacts/[id]/ledger/route.ts`, `db-accounting-v1-migration.sql`, `package.json`.
**Build:** `npx tsc --noEmit` ✅ ۰ خطا. `npm run build` ✅ سبز.
**ناتمام:** فیلد `invoiceCode` در فرم ثبت تراکنش جدید (`transactions/new`) نمایش داده نمی‌شود — می‌توان بعداً اضافه کرد.
**برای جلسه‌ی بعد:** (۱) اجرای `db-accounting-v1-migration.sql` در pgAdmin. (۲) دیپلوی. (۳) تست ledger drawer روی طرف‌حساب‌های واقعی.

## 📓 2026-06-19 — v0.9.27: App Shell + Enterprise Header + Sidebar resize — اکانت ۲
**چه شد:**
(۱) **App Shell (`app/(app)/layout.tsx`):** Wrapper از `min-h-screen flex flex-col` (صفحه بلند = کل سند scroll می‌کرد) → `h-screen flex overflow-hidden` (viewport ثابت). حالا Sidebar و main هر کدام مستقلاً scroll می‌کنند.
(۲) **Sidebar (`Sidebar.tsx`):** `h-screen sticky top-0` → `h-full` (درون shell کافی است). Width: `w-60`/`w-16` → `w-64`/`w-20`. Duration: `duration-200` → `duration-300`. nav داخلی scrollbar مخفی شد (`[&::-webkit-scrollbar]:w-0 [scrollbar-width:none]`). Brand row از `h-14` → `h-16` (هم‌ارتفاع با Header جدید).
(۳) **Header (`Header.tsx`):** `h-14 justify-end bg-surface` → `h-16 justify-between bg-surface/95 backdrop-blur-sm shrink-0`. ساختار: سمت راست (start در RTL) = slot خالی برای `GlobalBranchSelector` آینده؛ سمت چپ (end در RTL) = Realtime + Bell + UserMenu.
(۴) **inventory/items:** Sticky search bar از `top-14` → `top-16` (offset صحیح با Header جدید).
**فایل‌ها:** `app/(app)/layout.tsx`، `components/layout/Sidebar.tsx`، `components/layout/Header.tsx`، `app/(app)/inventory/items/page.tsx`، `package.json`.
**Build:** `npx tsc --noEmit` ✅ ۰ خطا. `npm run build` ✅ سبز.
**ناتمام:** —
**برای جلسه‌ی بعد:** ساخت `GlobalBranchSelector` و mount در slot راست Header. دیپلوی روی Liara.

