# HANDOFF.md — دفتر وضعیت زنده‌ی پروژه «با شرف»

> قانون طلایی: **هر جلسه اول بخش ۰ را بخوان؛ آخر جلسه بخش ۰ + ژورنال را به‌روز کن و commit/push کن.**
> جزئیات تاریخی قدیمی‌تر: `project-docs/handoff-archive.md`.

---

## ⚡ بخش ۰ — وضعیت لحظه‌ای (اول این را بخوان)

| | |
|---|---|
| **نسخه** | `main` = `08a2852` (= origin/main؛ production). branchهای محلی push‌نشده: `fix/branch-scope-all-roles` (۷ رفع + مستندات) و روی آن `feat/tx-idempotency` (پشت flag). |
| **آخرین به‌روزرسانی** | 2026-10-30 (مسیر کاری: `~/Claude-Projects/01-Active/basharaf-app`) |
| **Build/tsc** | fix branch: tsc ✅ · unit 762/762 ✅ · lint ۰ خطا (۸ warning) · build ✅ — feat branch: 770/770 ✅ · build ✅ |
| **دیپلوی** | push روی main = دیپلوی خودکار Liara. تست بمب‌ساعتی رزرو رفع شده (31b4d6f). |
| **کار نیمه‌تمام (in-progress)** | ۱) استودیو رسپی (WIP commit‌نشده روی main؛ ۱۰ صفحه placeholder، migrationها اجرا نشده، bootstrap بدون auth). ۲) branch `fix/branch-scope-all-roles` منتظر بازبینی/merge. |
| **کار بعدی پیشنهادی** | ۱) تست با کاربر واقعی Chef/Warehouse و پیش‌فاکتور، بعد merge fix branch (با دستور کاربر). ۲) بررسی پیش‌فاکتورهای قبلی که اشتباهاً تأیید شده‌اند. ۳) migration idempotency + flag. فهرست کامل: `~/Claude-Projects/MASTER_ROADMAP.md`. |
| **یافته‌ی مهم این نشست** | ممیزی ۲۰۲۶-۱۰-۳۰: Chef/Warehouse در ۲۵ route به شعب دیگر دسترسی داشتند (رفع روی branch). گزارش کامل: `~/Claude-Projects/_audit/basharaf-app-audit.md`. |
| **بلاک‌شده/منتظر کاربر** | ۱) اجرای دو migration رزرو (بالا). ۲) تصمیم درباره‌ی استودیو رسپی (بخش نیمه‌تمام قدیمی‌تر). موارد HR/Payroll قدیمی‌تر (نشست ۲۰۲۶-۰۸-۰۵) هنوز بدون پیگیری‌اند — جزئیات در آرشیو. |

> ⚠️ **نکته مهم برای جلسات بعدی:** فرم `/apply` حالا کاملاً داینامیک و دیتابیس‌محور است. **دیگر فیلد hard-code به `app/apply/page.tsx` یا `lib/recruitment/` اضافه نکنید.** همه فیلدهای جدید باید از طریق `/recruitment/form-builder` ایجاد شوند.

> ⚠️ **مستندات investigation قدیمی را کورکورانه باور نکنید:** `project-docs/financial-integrity-spec.md`، `INVESTIGATION-full-project-review.md`، `domain-audit.md`، `inventory-audit.md` گزارش‌های تاریخی‌اند — بخش زیادی از گپ‌هایی که توصیف می‌کنن از قبل رفع شده (تأییدشده در نشست ۲۰۲۶-۰۷-۲۷). قبل از اقدام روی هر ادعای این اسناد، حتماً با `grep`/خواندن مستقیم کد فعلی تأیید کنید — یک هشدار مشابه بالای خودِ این فایل‌ها هم اضافه شده.

---

## 📋 پروتکل جلسه

### شروع هر جلسه (الزامی — به ترتیب)
⛔ **تنها یک نشست فعال Claude Code مجاز است روی این پوشه ویرایش کند — دو نشست همزمان باز نکن.**
1. این فایل، بخش ۰ + جدیدترین ورودی ژورنال را بخوان.
2. `git status` بزن — اگر تغییرات commit‌نشده هست، یعنی جلسه‌ی قبل ناقص بسته شده: اول وضعیت را با کاربر روشن کن، چیزی را کورکورانه commit یا revert نکن.
3. `git log -5 --oneline` — تطبیق بده با ژورنال.
4. به کاربر خلاصه بگو: «وضعیت X است، کار نیمه‌تمام Y، پیشنهاد بعدی Z» و منتظر تأیید بمان.

### پایان هر جلسه / بعد از هر تغییر معنادار (الزامی)
1. یک ورودی ژورنال با **قالب زیر** به بالای بخش ژورنال اضافه کن.
2. بخش ۰ را به‌روز کن (نسخه، تاریخ، کار نیمه‌تمام، کار بعدی).
3. اگر ژورنال بیش از **۷ ورودی** شد، قدیمی‌ها را به `project-docs/handoff-archive.md` منتقل کن.
4. `git add -A && git commit -m "..." && git push` — **بدون push جلسه را نبند.**
5. ⛔ **دیگر ZIP نساز** — GitHub Actions خودکار deploy می‌کند (از 2026-06-24).

### قالب اجباری ورودی ژورنال
```markdown
## 📓 [تاریخ] — [عنوان کوتاه]
**چه شد:** (۲–۵ خط، تصمیم‌های مهم + چرایی)
**فایل‌ها:** (مسیر کامل ایجاد/ویرایش‌شده‌ها)
**Build:** tsc/build سبز یا خطا + متن خطا
**ناتمام:** دقیقاً کجا متوقف شد، چه چیزی نیمه‌کاره است (اگر هیچ: «—»)
**برای جلسه‌ی بعد:** کار بعدی مشخص + هر هشداری که جلسه‌ی بعد باید بداند
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

## 📓 2026-10-30 (۲) — رفع رزومه/SSRF و پیش‌فاکتور + Idempotency تراکنش (branch جدا)
**چه شد:** با تأیید کاربر: (الف) `db-hr-job-titles.sql` بازنویسی‌شده به نسخه‌ی commit‌شده برگشت (نسخه‌ی تغییرکرده در `~/Claude-Projects/_audit/preserved/` نگه داشته شد). (ب) `resumeUrl` فرم `/apply` فقط data URI با نوع مجاز؛ route رزومه فقط https روی Supabase پروژه را redirect می‌کند و `resumes-zip` دیگر URL دلخواه را سمت سرور fetch نمی‌کند (SSRF) — fb10613. (ج) **باگ مالی:** repo کلاینت `status`/`invoiceCode` را نمی‌فرستاد → پیش‌فاکتور مدیر کل فوراً تأیید و روی موجودی صندوق اعمال می‌شد و کد فاکتور گم می‌شد — cde097b. (د) Idempotency-Key برای ثبت تراکنش روی branch جدای `feat/tx-idempotency` (پشت flag، نیازمند migration).
**فایل‌ها:** `lib/recruitment/resumeUrl.ts`، `lib/validations/recruitment.ts`، `app/api/recruitment/[id]/resume/route.ts`، `app/api/recruitment/resumes-zip/route.ts`، `lib/repos/api.ts`، `tests/unit/resume-url.test.ts`، `tests/unit/transactions-repo-body.test.ts`.
**Build:** tsc ✅ · unit 762/762 ✅ (روی feat: 770) · lint ۰ خطا · build ✅.
**ناتمام:** هیچ‌کدام push نشده. ⚠️ پیش‌فاکتورهایی که قبلاً مدیر کل ثبت کرده احتمالاً به‌عنوان تراکنش تأییدشده روی موجودی اثر گذاشته‌اند — بررسی داده‌ی production با کاربر (فقط خواندن).
**برای جلسه‌ی بعد:** ترتیب merge: اول `fix/branch-scope-all-roles`، بعد `feat/tx-idempotency`. فعال‌سازی idempotency: push کد → اجرای `project-docs/migrations/db-idempotency-keys.sql` → `TX_IDEMPOTENCY_ENABLED=1` در Liara.

## 📓 2026-10-30 — ممیزی کامل در `~/Claude-Projects` + رفع ۴ نقص دسترسی/یکپارچگی — روی branch `fix/branch-scope-all-roles`
**چه شد:** پروژه به `~/Claude-Projects/01-Active/basharaf-app` کپی شد (نسخه‌ی کاری از ۲۰۲۶-۱۰-۲۹؛ `~/Documents/basharaf-app` بکاپ ثابت است). ممیزی کامل کد (گزارش: `~/Claude-Projects/_audit/basharaf-app-audit.md`). سه نقص تأییدشده رفع شد: (۱) ۲۵ route فقط `role === 'BranchUser'` را به شعبه محدود می‌کردند و Chef/Warehouse به داده‌ی شعب دیگر دسترسی داشتند → `canUseBranch`/`branchScope` (f1cf927) + تست نگهبان ایستا. (۲) `/api/inventory/expiry` اقلام همه‌ی شعب را برمی‌گرداند → فیلتر شعبه (8182820). (۳) محاسبه‌ی مجدد حقوق وضعیت را بیرون تراکنش چک می‌کرد و می‌توانست اجرای تأییدشده را بازنویسی کند → قفل `FOR UPDATE` و چک مجدد داخل تراکنش (e855187). (۴) رمز پیش‌فرض hard-code `basharaf123` در `lib/repos/api.ts` حذف شد (2e8da9e). ⚠️ seed قدیمی (`v0.9.7-*/basharaf-deploy`) حساب‌هایی با همین رمز می‌ساخت — کاربر باید چک کند در production حسابی با این رمز نمانده باشد. کار WIP استودیو رسپی دست نخورد.
**فایل‌ها:** ۲۳ فایل زیر `app/api/**` (attendance، shift-assignments، purchase-orders، inventory/*، equipment، maintenance، orders/*، dashboard/overview، transactions/import)، `app/api/inventory/expiry/route.ts`، `app/api/payroll/runs/[id]/calculate/route.ts`، `tests/unit/branch-scope-routes.test.ts`.
**Build:** tsc ✅ · unit 735/735 ✅ · lint ✅ (۸ warning قدیمی، ۰ خطا) · build ✅ — بدون `DATABASE_URL`. تست‌های integration/e2e اجرا نشدند (دیتابیس آزمایشی لازم است).
**ناتمام:** branch push/merge نشده (منتظر تأیید کاربر). رفتار جدید: کاربر Chef/Warehouse فقط شعبه‌ی خودش؛ کاربر غیر SuperAdmin بدون شعبه حالا ۴۰۳ می‌گیرد (قبلاً همه‌ی شعب را می‌دید) — قبل از merge با کاربران واقعی چک شود.
**برای جلسه‌ی بعد:** ⚠️ WIP commit‌نشده روی main: `project-docs/migrations/db-hr-job-titles.sql` با محتوای `db-hr-attendance-integrity.sql` بازنویسی شده (احتمالاً اشتباه) — بدون تأیید کاربر commit نشود. ⚠️ `app/api/recipe-studio/auth/bootstrap` (WIP) احراز هویت ندارد. باقی یافته‌ها (double-submit تراکنش، `resumeUrl` آزاد در `/apply`، نبود منبع واحد migration، rate-limit درون‌حافظه) در `~/Claude-Projects/MASTER_ROADMAP.md`.

## 📓 2026-10-28 — دیپلوی لیارا از ۲۶ اکتبر fail می‌شد: سبک‌کردن نصب روی سرور build
**چه شد:** ۳ دیپلوی آخر (3b4b49e، c3d3498، 9f7f22a + اجرای دوباره‌ی ۲۸ اکتبر) در مرحله‌ی «Deploy to Liara» fail شدند؛ lint/tsc/تست همه سبز. لاگ لیارا در دسترس نبود (API گیت‌هاب ۴۰۳، توکن لیارا را عمداً نخواندم). شواهد: دیپلوی‌های موفق ۱۰–۱۴ دقیقه و همه‌ی failها حدود ۱۵–۱۶ دقیقه → به‌احتمال زیاد **سقف زمانی build لیارا**، نه خطای کد. تأیید محلی: build تمیز از git (Node 20) در ~۴۰ ثانیه موفق؛ build با DATABASE_URL غیرقابل‌دسترس هم ~۴۰ ثانیه (build به دیتابیس وصل نمی‌شود)؛ هیچ پکیجی بین آخرین موفق و failها عوض نشده. رفع: در workflow قبل از `liara deploy` فایل `.npmrc` با `omit=dev` ساخته می‌شود (فقط روی runner، commit نمی‌شود) تا لیارا ابزارهای تست/توسعه را نصب نکند (۶۶۵ → ۳۳۸ پکیج، ۵۹۰ → ۴۷۰ مگابایت). tailwindcss، tailwindcss-rtl، postcss، autoprefixer و typescript به dependencies منتقل شدند چون build به آن‌ها نیاز دارد (بدون typescript مسیرهای `@/` resolve نمی‌شوند — تست شد).
**فایل‌ها:** `.github/workflows/liara.yml`، `package.json`، `package-lock.json`.
**Build:** tsc ✅ · unit 734/734 ✅ · lint ✅ · build با `omit=dev` روی کپی تمیز ✅.
**ناتمام:** push نشده (منتظر دستور کاربر). تضمینی نیست که کافی باشد؛ اگر باز fail شد باید لاگ build را از پنل لیارا دید (یا پلن/سقف زمان build).
**برای جلسه‌ی بعد:** اگر هنوز timeout: لاگ پنل لیارا، بعد گزینه‌ها: محل build ایران (ریسک اتصال GitHub — دلیل انتخاب آلمان در ژوئن)، یا ارتقای پلن.

## 📓 2026-10-27 — صفحه‌ی مدیریت «پرسنل و حقوق» + بخش سالن/آشپزخانه + سخت‌گیری دسترسی + کاهش زمان دیپلوی — روی branch
**چه شد:** (۱) صفحه‌ی جدید `/hr/staff` (منوی منابع انسانی: «پرسنل و حقوق»): همه‌ی پرسنل فعال شعبه‌های در دسترس مدیر، با فیلتر ماه/بخش/نام؛ برای هر نفر بخش، وضعیت پنل (بدون لینک/در انتظار/فعال)، Face ID، «الان داخل» از رویدادهای ورود/خروج، روز و ساعت تأییدشده/منتظر تأیید ماه، و فقط با `hr.compensation.view` دستمزد و جمع ریز کارکرد (کلیک → همان نمای ریز کارکردی که خود نفر در `/me` می‌بیند). APIها: `GET /api/hr/staff-overview` (`hr.attendance.view` + branchScope) و `GET /api/hr/staff-overview/[id]` (`hr.compensation.view` + assertBranch). (۲) بالای پنل پرسنل به‌جای سمت (گارسون/…) بخش نوشته می‌شود: `sectionOfRole` → «سالن» یا «آشپزخانه». (۳) **حفره‌ی دسترسی رفع شد:** `POST /api/attendance` و `POST /api/shift-assignments` شناسه‌ی پرسنل را از بدنه می‌گرفتند و شعبه‌ی آن نفر را چک نمی‌کردند؛ حالا `lib/hr/employeeScope.ts` (۴۰۳ برای نفر شعبه‌ی دیگر، جز سوپرادمین) و در حضور، تطبیق نفر با شیفت‌اش (`ASSIGNMENT_MISMATCH`). (۴) دیپلوی: دو push آخر بعد از ~۱۷ دقیقه fail شد (به احتمال زیاد timeout بیلد لیارا؛ build محلی ۳۸ ثانیه). `.liaraignore` اضافه شد (تست‌ها، مستندات، اسکریپت‌ها، گزارش‌ها آپلود نمی‌شوند) و `/admin` که هنگام build به دیتابیس وصل می‌شد `force-dynamic` شد.
**فایل‌ها:** (جدید) `app/(app)/hr/staff/page.tsx`، `components/hr/StaffOverview.tsx`، `app/api/hr/staff-overview/{route,[id]/route}.ts`، `lib/hr/employeeScope.ts`، `.liaraignore` · (ویرایش) `app/(app)/hr/layout.tsx`، `app/api/attendance/route.ts`، `app/api/shift-assignments/route.ts`، `app/api/me/profile/route.ts`، `lib/staff-panel/pure.ts`، `components/me/MeClient.tsx`، `app/(admin)/admin/page.tsx`، `tests/unit/staffPanel.test.ts`، `project-docs/STAFF-PANEL.md`.
**Build:** tsc ✅ · unit 734/734 ✅ · lint ✅ · build ✅ (۳۸ ثانیه) · سرتاسری روی Postgres محلی: مدیریت ۱۲/۱۲، پنل پرسنل ✅.
**ناتمام:** لاگ واقعی fail دیپلوی از لیارا لازم است. merge/push منتظر علی؛ قبل از push، `db-staff-statements.sql` اجرا شود.

## 📓 2026-10-26 (۲) — پنل پرسنل با تم صفاسیتی + ریز کارکرد و «حقوق بر چه اساسی» — روی branch
**چه شد:** پنل `/me` با تم صفاسیتی بازطراحی شد (زمینه‌ی کرم، سرمه‌ای، Haiku، آیکن‌های دودل بسته‌ی برند، ناوبری پایین: خانه/حضور/حقوق/من). روش حقوق ساعتی از اکسل‌های حقوق صفاسیتی استخراج و با رسیدهای بانکی مهر ۱۴۰۵ تا تومان تطبیق داده شد (۱۰ مورد): آشپزخانه = حقوق توافقی ÷ ۲۰۸ ساعت، حقوق ثابت کامل، اضافه‌کاری (ساعت − ۲۰۸) × نرخ × ۱٫۴ گرد به ۱۰۰۰ تومان؛ سالن = حقوق ÷ ۲۴ × (روز حضور + یک روز به ازای هر ۶ شیفت). جدول جدید فقط‌خواندنی `staff_statements` (migration `db-staff-statements.sql`، اجرا نشده) برای ریز کارکرد ماه‌های واردشده؛ به payslips/payroll_runs دست نمی‌زند. اسکریپت `scripts/staff-statements-sql.ts` فقط SQL می‌سازد (روی فایل‌های واقعی ۱۳ نفر بدون هشدار؛ فقط مهر). **باگ اسکریپت قبلی** `staff-import-sql.ts` (مسیر اکسل بدون --out نادیده گرفته می‌شد) رفع شد (`9604300`).
**نکته‌ی مهم برای جلسه‌ی بعد:** روش اکسل (اضافه‌کاری ماهانه بیش از ۲۰۸ ساعت، بدون بیمه/مالیات) با `calculateHourlyPayslip` سیستم (اضافه‌کاری بر اساس هر شیفت، با بیمه/مالیات) فرق دارد؛ پنل فعلاً روش اکسل را نشان می‌دهد. تصمیم علی لازم است کدام مبنا در سیستم برقرار شود.
**فایل‌ها:** (جدید) `lib/staff-panel/statements.ts`، `app/api/me/statements/{route,[id]/route}.ts`، `components/me/parts.tsx`، `scripts/staff-statements-sql.ts`، `tests/unit/staffStatements.test.ts`، `project-docs/migrations/db-staff-statements.sql`، `public/safasity/me-*.png` · (ویرایش) `lib/db/schema.ts`، `components/me/MeClient.tsx`، `app/me/page.tsx`، `project-docs/STAFF-PANEL.md`، `.gitignore`.
**Build:** tsc ✅ · unit همه ✅ · lint ✅ · ۴۵ سناریوی سرتاسری روی Postgres واقعی محلی ✅ · ظاهر موبایل بررسی شد.
**ناتمام:** merge/push منتظر علی. ترتیب راه‌اندازی: (۱) `db-staff-statements.sql` (۲) فهرست پرسنل (۳) ریز کارکرد مهر (۴) نرخ ساعتی و لینک شخصی هر نفر.

## 📓 2026-10-26 — پنل پرسنل `/me` (حضور، شیفت، حقوق، مشخصات) + آیکن basharaf — روی branch
**چه شد:** (۱) آیکن صفحه‌ی اصلی `/clock` با لوگوی صفاسیتی (کرم روی سرمه‌ای) و اسم «basharaf» + manifest جدا (`start_url=/clock`، `display=browser`) منتشر شد (`ced2b9a`). (۲) به درخواست علی پنل پرسنل ساخته شد (هنوز منتشر نشده): هویت = همان گوشی فعال‌شده‌ی ثبت حضور؛ حقوق و بخش حساس مشخصات با «قفل Face ID» (کوکی امضاشده‌ی ۱۰ دقیقه‌ای `basharaf-me-unlock` که به گوشی بسته است). فقط فیش دوره‌های `approved/posted`؛ سهم بیمه‌ی کارفرما جدا و «از حقوق شما کم نمی‌شود»؛ کد ملی/شبا/بیمه فقط ۴ رقم آخر؛ نرخ ساعتی و یادداشت مدیر در حضور برنمی‌گردد. دانلود قرارداد ساخته نشد (جای نگهداری فایل ندارد). اسکریپت `scripts/staff-import-sql.ts` از اکسل فقط نام/سمت/تلفن را به یک فایل SQL تبدیل می‌کند (به DB وصل نمی‌شود؛ خروجی commit نشود، در .gitignore).
**فایل‌ها:** (جدید) `lib/staff-panel/{pure,session}.ts`، `app/api/me/{unlock,unlock/options,attendance,shifts,payslips,payslips/[id],profile}/route.ts`، `app/me/page.tsx`، `components/me/MeClient.tsx`، `scripts/staff-import-sql.ts`، `tests/unit/staffPanel.test.ts`، `project-docs/STAFF-PANEL.md`، `public/icons/*`، `public/clock.webmanifest` · (ویرایش) `lib/auth/sessionExpiry.ts` (`/me` عمومی)، `lib/auth/audit.ts`، `components/clock/ClockClient.tsx`، `.gitignore`.
**Build:** tsc ✅ · unit همه ✅ · lint ✅ · ۳۵ سناریوی سرتاسری روی Postgres واقعی محلی با داده‌ی ساختگی ✅ (ایزوله بودن دو نفر، فیش پیش‌نویس پنهان، فیش دیگران ۴۰۴، Face ID جعلی/تکراری رد، گوشی لغوشده ۴۰۱، audit) · UI موبایل محلی ✅. **بدون migration.**
**ناتمام:** merge/push منتظر علی. برای استفاده: فهرست پرسنل (SQL) در pgAdmin، نرخ ساعتی هر نفر، لینک شخصی برای هر نفر. قرارداد: نیاز به تصمیم درباره‌ی محل فایل.

## 📓 2026-10-21 — ثبت حضور: تأیید با Face ID/اثر انگشت + گزارش بازه‌ای و CSV — روی branch
**چه شد:** نسخه‌ی اول (IP مغازه + لینک شخصی) دیروز با migration اول دیپلوی شد و آزمون جعل IP روی basharaf.me پاس شد. به درخواست علی تأیید «صاحب گوشی» با WebAuthn passkey اضافه شد (`@simplewebauthn/server@13.3.3` + `browser@13.3.0`): یک بار فعال‌سازی روی گوشی، سپس هر ورود/خروج امضای یک‌بارمصرف با UV اجباری؛ فقط کلید عمومی ذخیره می‌شود؛ کوکی گوشی + passkey هر دو لازم‌اند. کلید سراسری روشن/خاموش (`app_settings: attendance.clock.requireFaceId`، پیش‌فرض روشن) و استثنای فردی (`face_id_exempt`، با لینک جدید حفظ می‌شود). rpID/origin از سرآیند Origin مرورگر (پشت پراکسی Host ممکن است داخلی باشد). بهبودها: تاریخچه‌ی امروز روی گوشی، گزارش بازه‌ای (≤۳ ماه) با فیلتر نفر، مدت، نشان Face ID، جمع هر نفر، خروجی CSV با BOM؛ راهنمای حالت صفحه‌ی اصلی آیفون.
**فایل‌ها:** (جدید) `lib/attendance-clock/{passkey,origin}.ts`، `app/api/clock/passkey/{register-options,register,auth-options}/route.ts`، `app/api/hr/clock/settings/route.ts`، `project-docs/migrations/db-attendance-clock-faceid.sql` · (ویرایش) `lib/db/schema.ts`، `lib/attendance-clock/service.ts`، `app/api/clock/{punch,status}/route.ts`، `app/api/hr/clock/{events,links,links/[id]}/route.ts`، `components/clock/ClockClient.tsx`، `components/hr/ClockView.tsx`، `lib/auth/audit.ts`، `tests/unit/attendanceClock.test.ts`، `project-docs/ATTENDANCE-CLOCK.md`، `package.json`/`package-lock.json`.
**Build:** tsc ✅ · unit 692/692 ✅ · lint ✅ · migration دوم روی Postgres واقعی محلی روی داده‌ی موجود دوبار ✅ و برابر schema ✅ · ۲۵ سناریوی قبلی (Face ID خاموش) ✅ · ۲۳ سناریوی Face ID با authenticator نرم‌افزاری ✅ (یک انتظار اشتباه در خود اسکریپت آزمون اصلاح شد) · UI محلی ✅ · build: نتیجه در گزارش نشست.
**ناتمام:** migration دوم اجرا نشده؛ merge/push منتظر علی. ترتیب: اول `db-attendance-clock-faceid.sql`، بعد push. Face ID واقعی آیفون فقط روی سایت https قابل آزمون است.
