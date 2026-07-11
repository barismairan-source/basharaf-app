# HANDOFF.md — دفتر وضعیت زنده‌ی پروژه «با شرف»

> این فایل **دفتر رله‌ی بین دو اکانت Claude Code** است که نوبتی روی همین پوشه کار می‌کنند.
> قانون طلایی: **هر جلسه اول بخش ۰ را بخوان؛ آخر جلسه بخش ۰ + ژورنال را به‌روز کن و commit/push کن.**
> جزئیات تاریخی قدیمی‌تر: `project-docs/handoff-archive.md`.

---

## ⚡ بخش ۰ — وضعیت لحظه‌ای (اول این را بخوان)

| | |
|---|---|
| **نسخه** | `0.16.1-ownership-faz3-prep` |
| **آخرین به‌روزرسانی** | 2026-07-11 — اکانت: ۱ |
| **Build/tsc** | tsc سبز ✅ (۰ خطا) |
| **دیپلوی** | ✅ GitHub Actions فعال. Branch: `main` — push شده. |
| **کار نیمه‌تمام (in-progress)** | — |
| **کار بعدی پیشنهادی** | کاربر بخش A فایل `db-ownership-data-migration.sql` را در pgAdmin اجرا و نام شعبه را تأیید می‌کند → سپس بخش B را اجرا می‌کند → سپس Faz 3 کد (partner_id به Drizzle) |
| **بلاک‌شده/منتظر کاربر** | ⏳ اجرای بخش A و B فایل `db-ownership-data-migration.sql` در pgAdmin |

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
- پول **bigint تومان** در DB؛ در TypeScript `number` (JS safe integer تا ۹۰۰۰ تریلیون کافی است).
- تاریخ کاربری **جلالی text** (مثل `۱۴۰۳-۰۴-۱۵`)؛ تاریخ داخلی `timestamp` میلادی.
- `JWT_SECRET` حتماً ≥۳۲ کاراکتر.
- فرم `/apply` کاملاً داینامیک — فیلد hard-code اضافه نکن.

---

## 📓 ژورنال نشست‌ها (جدیدترین بالا — حداکثر ۷ ورودی)

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

## 📓 2026-07-10 — بازچینی سلسله‌مراتب داشبورد (v0.13.0) — اکانت ۱
**چه شد:** فاز hierarchy داشبورد — ۶ commit روی شاخه‌ی `refactor/dashboard-hierarchy` سپس merge به main:
1. **DashCard**: کامپوننت مشترک wrapper برای همه کارت‌های داشبورد (title+icon+badge+viewAll header).
2. **KPICard + formatMoneyParts**: تابع جدید `formatMoneyParts()` در `lib/design/format.ts` که عدد و «تومان» جدا برمی‌گرداند؛ KPICard حالا `text-2xl` برای عدد و `text-[11px] text-stone-400` برای واحد.
3. **page.tsx بازنویسی کامل**: ۶ بخش با `SectionLabel`، `space-y-8`، ترتیب «۳ ثانیه‌ی اول مدیر» (نبض→توجه→مالی→عملیات→تراکنش→استخدام).
4. **AttentionWidget + HRSummaryCard → DashCard**.
5. **شرکا → DashCard**: icon=Users2، violet رنگ، mini-cards از border-stone به `bg-stone-50 hover:bg-stone-100`.
6. **RecruitmentWidget ساده**: ستاره‌ها حذف، API فیلتر `eq(status, 'new')` اضافه، limit 4→3، فقط نام+حوزه.
**فایل‌ها:** `components/dashboard/DashCard.tsx` (جدید)، `components/dashboard/index.ts`، `lib/design/format.ts`، `components/dashboard/KPICard.tsx`، `app/(app)/dashboard/page.tsx`، `components/dashboard/AttentionWidget.tsx`، `components/dashboard/HRSummaryCard.tsx`، `app/api/dashboard/applicants/route.ts`، `components/dashboard/RecruitmentWidget.tsx`
**Build:** tsc ✅ ۰ خطا · build ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** تست دستی داشبورد دسکتاپ+موبایل. بررسی KPI text-2xl، کارت‌های شرکا با استایل جدید، RecruitmentWidget بدون ستاره.

## 📓 2026-07-10 — داشبورد: حذف نویز empty/zero (v0.12.1) — اکانت ۱
**چه شد:** ۶ commit مستقل روی رفتار کارت‌های خالی/صفر:
1. Sparklines حذف (داده mock/hardcode بود — گمراه‌کننده).
2. علامت منفی یکپارچه: `formatMoneyShort` مقدار مستقیم (بدون `Math.abs`) می‌گیرد.
3. AttentionWidget خالی → نوار ۴۰px emerald.
4. HRSummaryCard ۰ پرسنل → خط لینک به `/employees`.
5. شرکا تسویه → نوار emerald.
6. BranchSummary فقط اگر ≥۲ شعبه غیرصفر؛ BreakdownCard فقط اگر ≥۲ دسته.
**فایل‌ها:** `lib/sparklines.ts` (حذف)، `lib/design/format.ts`، `KPICard.tsx`، `BranchSummary.tsx`، `AttentionWidget.tsx`، `HRSummaryCard.tsx`، `page.tsx`
**Build:** tsc ✅ · build ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** فاز hierarchy (ترتیب و DashCard یکپارچه).

## 📓 2026-07-10 — داشبورد فاز ۳: روند درصدی + ویجت داوطلبان (v0.12.0) — اکانت ۱
**چه شد:** FlashReport دو فیلد جدید (`invoiceCountPctChange`، `primeCostPctChange`). DeltaBadge با prop `invert` برای Prime Cost. ویجت داوطلبان تازه `/api/dashboard/applicants` + `RecruitmentWidget.tsx` با ستاره‌های inline (بعداً در v0.13.0 حذف شد).
**فایل‌ها:** `lib/reports/flashReport.ts`، `FlashReportCard.tsx`، `app/api/dashboard/applicants/route.ts`، `RecruitmentWidget.tsx`، `index.ts`، `page.tsx`
**Build:** tsc ✅ · build ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** تست بصری FlashReportCard delta، ویجت داوطلبان.

## 📓 2026-07-10 — داشبورد فاز ۲: معماری سه‌لایه (v0.11.0) — اکانت ۱
**چه شد:** AnomalyBanner (جدید)، AttentionWidget جایگزین OperationsStrip، HRSummaryCard، بخش «وضعیت شرکا» از store.contacts. UnifiedOverview و OperationsStrip از export حذف.
**فایل‌ها:** `AnomalyBanner.tsx`، `AttentionWidget.tsx`، `HRSummaryCard.tsx`، `index.ts`، `page.tsx`
**Build:** tsc ✅ · build ✅ · 48 unit tests ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** تست بصری سه‌لایه.

## 📓 2026-07-10 — اصلاح داشبورد: تکرار، فرمت، نام‌گذاری (v0.10.3) — اکانت ۱
**چه شد:** UnifiedOverview بخش تکراری → «وضعیت مالی». علامت +/− از RecentList حذف. KPICard `formatMoneyShort` با `title` hover. «کارآگاه مالی» → «دستیار مالی» در nav/permissions/UI.
**فایل‌ها:** `UnifiedOverview.tsx`، `RecentList.tsx`، `KPICard.tsx`، `BranchSummary.tsx`، `nav-config.ts`، `permissions.ts`، `anomaly/page.tsx`، `DetectivePane.tsx`
**Build:** tsc ✅ · build ✅
**ناتمام:** —

## 📓 2026-07-09 — پنل استخدام v2 + باگ validation فرم (v0.10.2) — اکانت ۱
**چه شد:** باگ ۴۰۰ در /apply (age/gender اجباری در schema سرور) رفع شد. Collapse، Q&A hierarchy، امتیاز سریع، URL فیلترها، مقایسه modal، تگ کلمات کلیدی — همه در یک بازنویسی کامل `recruitment/page.tsx`.
**فایل‌ها:** `recruitment/page.tsx`، `lib/validations/recruitment.ts`، `app/apply/page.tsx`
**Build:** tsc ✅ · build ✅ · 48 unit tests ✅
**ناتمام:** —

