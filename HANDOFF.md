# HANDOFF.md — دفتر وضعیت زنده‌ی پروژه «با شرف»

> این فایل **دفتر رله‌ی بین دو اکانت Claude Code** است که نوبتی روی همین پوشه کار می‌کنند.
> قانون طلایی: **هر جلسه اول بخش ۰ را بخوان؛ آخر جلسه بخش ۰ + ژورنال را به‌روز کن و commit/push کن.**
> جزئیات تاریخی قدیمی‌تر: `project-docs/handoff-archive.md`.

---

## ⚡ بخش ۰ — وضعیت لحظه‌ای (اول این را بخوان)

| | |
|---|---|
| **نسخه** | `0.13.0-dashboard-hierarchy` |
| **آخرین به‌روزرسانی** | 2026-07-10 — اکانت: ۱ |
| **Build/tsc** | tsc سبز ✅ (۰ خطا) · build ✅ · 48 unit tests سبز |
| **دیپلوی** | ✅ GitHub Actions فعال. همه migration‌ها روی production. Branch: `main` — push شده. |
| **کار نیمه‌تمام (in-progress)** | — |
| **کار بعدی پیشنهادی** | تست دستی داشبورد: ① نبض سیستم فقط SuperAdmin، ② AttentionWidget در بالا، ③ KPI اعداد text-2xl، کارت‌های شرکا bg-stone-50، ⑥ RecruitmentWidget فقط status=new حداکثر ۳ ردیف بدون ستاره. موبایل ۳۹۰px: بخش‌های ① و ② کامل نمایان. |
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
- پول **bigint تومان** در DB؛ در TypeScript `number` (JS safe integer تا ۹۰۰۰ تریلیون کافی است).
- تاریخ کاربری **جلالی text** (مثل `۱۴۰۳-۰۴-۱۵`)؛ تاریخ داخلی `timestamp` میلادی.
- `JWT_SECRET` حتماً ≥۳۲ کاراکتر.
- فرم `/apply` کاملاً داینامیک — فیلد hard-code اضافه نکن.

---

## 📓 ژورنال نشست‌ها (جدیدترین بالا — حداکثر ۷ ورودی)

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

## 📓 2026-07-08 — HR UX بهبود پنل استخدام (v0.10.1) — اکانت ۱
**چه شد:** سوال کامل در detail card، حل ~7MB payload (resumeUrl حذف → hasResume:boolean + pagination 50تایی)، endpoint دانلود رزومه برای Safari iOS، error state در /apply.
**فایل‌ها:** `lib/recruitment/questions.ts`، `app/api/recruitment/route.ts`، `app/api/recruitment/[id]/resume/route.ts`، `recruitmentSlice.ts`، `recruitment/page.tsx`، `apply/page.tsx`
**Build:** tsc ✅ · build ✅ · 48 unit tests ✅
**ناتمام:** —
