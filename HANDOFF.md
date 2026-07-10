# HANDOFF.md — دفتر وضعیت زنده‌ی پروژه «با شرف»

> این فایل **دفتر رله‌ی بین دو اکانت Claude Code** است که نوبتی روی همین پوشه کار می‌کنند.
> قانون طلایی: **هر جلسه اول بخش ۰ را بخوان؛ آخر جلسه بخش ۰ + ژورنال را به‌روز کن و commit/push کن.**
> جزئیات تاریخی قدیمی‌تر: `project-docs/handoff-archive.md` (اگر نبود، اولین جلسه بسازد).

---

## ⚡ بخش ۰ — وضعیت لحظه‌ای (اول این را بخوان)

| | |
|---|---|
| **نسخه** | `0.12.1-dashboard-noise` |
| **آخرین به‌روزرسانی** | 2026-07-10 — اکانت: ۱ |
| **Build/tsc** | tsc سبز ✅ (۰ خطا) · build ✅ · 48 unit tests سبز |
| **دیپلوی** | ✅ GitHub Actions فعال. همه migration‌ها روی production. Branch: `main` — push شده. |
| **کار نیمه‌تمام (in-progress)** | — |
| **کار بعدی پیشنهادی** | ۱. تست دستی داشبورد با داده‌ی فعلی (صفر): AttentionWidget باریک سبز، شرکا تسویه باریک سبز، BranchSummary پنهان، BreakdownCard پنهان. ۲. تست حالت پر (با داده): هیچ‌چیز پنهان نشده باشد. ۳. تست FlashReportCard delta. |
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

## 📓 ژورنال نشست‌ها (جدیدترین بالا — حداکثر ۷ ورودی)

## 📓 2026-07-10 — داشبورد: حذف نویز empty/zero (v0.12.1) — اکانت ۱
**چه شد:** ۶ commit مستقل روی رفتار کارت‌های خالی/صفر:
1. **Sparklines حذف**: `lib/sparklines.ts` داده‌ی hardcode/mock بود — گمراه‌کننده. فایل حذف، prop اختیاری `spark` از KPICard دیگر pass نمی‌شود.
2. **علامت منفی یکپارچه**: `formatMoneyShort` از قبل LTR isolate داشت ولی caller ها با `Math.abs()` علامت را می‌گرفتند. حالا مقدار مستقیم پاس می‌شود — KPICard balance، BranchSummary موجودی، کارت‌های شرکا.
3. **AttentionWidget خالی → نوار ۴۰px**: وقتی هیچ آیتمی نیست، کارت کامل با نوار باریک emerald جایگزین می‌شود.
4. **HRSummaryCard ۰ پرسنل → خط**: وقتی `activeEmployees=0`، کارت کامل با یک خط لینک به `/employees` جایگزین.
5. **شرکا تسویه → یک خط**: کانتکت‌های `balance=0` از کارت‌ها حذف. اگر همه تسویه → نوار emerald با لینک `/contacts`.
6. **BranchSummary/BreakdownCard conditional**: BranchSummary فقط اگر ≥۲ شعبه غیرصفر؛ BreakdownCard فقط اگر ≥۲ دسته (با ۱ دسته نمودار ۱۰۰٪ اطلاعاتی ندارد، RecentList تمام‌عرض می‌شود).
**فایل‌ها:** `lib/sparklines.ts` (حذف)، `lib/design/format.ts`، `components/dashboard/KPICard.tsx`، `BranchSummary.tsx`، `AttentionWidget.tsx`، `HRSummaryCard.tsx`، `app/(app)/dashboard/page.tsx`
**Build:** tsc ✅ ۰ خطا · build ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** تست دستی: (الف) حالت پر از صفر: AttentionWidget=نوار سبز، شرکا=نوار سبز، BranchSummary=مخفی، Breakdown=مخفی. (ب) حالت با داده: هیچ‌چیز پنهان نشده باشد، علامت منفی روی موجودی منفی صحیح نشان داده شود.

## 📓 2026-07-10 — داشبورد فاز ۳: روند درصدی + ویجت داوطلبان (v0.12.0) — اکانت ۱
**چه شد:**
- **FlashReport: روند درصدی**: دو فیلد جدید در `FlashReportData`: `invoiceCountPctChange` (درصد تغییر تعداد فاکتور نسبت به هفته‌ی قبل) و `primeCostPctChange` (تفاوت نقطه‌ای Prime Cost % — عدد منفی = بهبود). محاسبه در `getFlashReport()` بدون query اضافه — از `lastWeek` که قبلاً fetch می‌شد.
- **FlashReportCard: چراغ‌راهنما**: `DeltaBadge` با prop `invert` — برای Prime Cost %، افت = سبز (خوب)، رشد = قرمز (بد). Delta زیر تعداد فاکتور و زیر Prime Cost % نشان داده می‌شود (unit: "پوینت" برای Prime Cost، "٪" برای بقیه).
- **ویجت داوطلبان تازه**: `/api/dashboard/applicants` — درخواست‌های `new` در ۷ روز اخیر، max 4 ردیف + totalNew. `RecruitmentWidget.tsx` — امتیاز ۵ ستاره inline با optimistic update + rollback. فقط برای SuperAdmin، فقط اگر `hasActivity=true`. Null-safe: `currentScore != null && n <= currentScore`.
- Merge به main + push انجام شد.
**فایل‌ها:** `lib/reports/flashReport.ts`، `components/dashboard/FlashReportCard.tsx`، `app/api/dashboard/applicants/route.ts` (جدید)، `components/dashboard/RecruitmentWidget.tsx` (جدید)، `components/dashboard/index.ts`، `app/(app)/dashboard/page.tsx`
**Build:** tsc ✅ ۰ خطا · build ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** ۱. تست بصری FlashReportCard (delta‌ها، به‌خصوص رنگ معکوس Prime Cost). ۲. تست ویجت داوطلبان (بدون داوطلب → نباید نمایش داشته باشد؛ با داوطلب → ستاره‌ها کار کنند). ۳. تصمیم Sparklines.

## 📓 2026-07-10 — داشبورد فاز ۲: معماری سه‌لایه (v0.11.0) — اکانت ۱
**چه شد:**
- **AnomalyBanner** (جدید): نوار هشدار باریک rose/amber زیر FlashReportCard. فقط اگر یافته‌ی باز high یا medium در anomaly_findings وجود داشته باشد رندر می‌شود — وگرنه `null` (فضا نمی‌گیرد).
- **AttentionWidget** (جدید): جایگزین `OperationsStrip` + بخش‌های مالی/انبار `UnifiedOverview`. یک fetch به `/api/dashboard/overview` + یک fetch به `/api/anomaly/findings/counts` (برای SuperAdmin). لیست اولویت‌بندی‌شده: anomaly high > pending tx > low stock > open PO > equipment > tasks. Max 5 آیتم؛ آیتم‌های ۴-۵ روی موبایل با `hidden sm:block` پنهان هستند. اگر همه صفر بود: پیام سبز "همه چیز خوب است".
- **HRSummaryCard** (جدید): خلاصه‌ی پرسنل/حقوق در لایه ۳ (از `/api/dashboard/overview`).
- **page.tsx**: بازنویسی کامل با ساختار سه‌لایه. بخش جدید «وضعیت شرکا» از `store.contacts` (کانتکت‌های فعال، مرتب از بیشترین قدرمطلق، max ۶ کارت، رنگ emerald/rose/stone بر اساس جهت موجودی).
- `UnifiedOverview` و `OperationsStrip` از export index حذف شدند (فایل‌ها محفوظ برای مرجع).
- **گزارش Sparklines**: `lib/sparklines.ts` داده‌های hardcode/mock است — به تراکنش واقعی وصل نیست. منتظر تصمیم کاربر.
- **Cheques dueSoon**: در این فاز نیامد (endpoint جدید نیاز دارد) — فاز ۳.
**فایل‌ها:** `components/dashboard/AnomalyBanner.tsx` (جدید)، `components/dashboard/AttentionWidget.tsx` (جدید)، `components/dashboard/HRSummaryCard.tsx` (جدید)، `components/dashboard/index.ts` (به‌روز)، `app/(app)/dashboard/page.tsx` (بازنویسی کامل)
**Build:** tsc ✅ ۰ خطا · build ✅ · 48 unit tests ✅
**ناتمام:** — Branch: `refactor/dashboard-phase2` — منتظر تست و merge.
**برای جلسه‌ی بعد:** ۱. تست بصری دسکتاپ+موبایل — سه لایه، AttentionWidget، شرکا، AnomalyBanner (اگر یافته باشد). ۲. تصمیم Sparklines. ۳. Merge به main.

## 📓 2026-07-10 — اصلاح داشبورد: تکرار، فرمت، نام‌گذاری (v0.10.3) — اکانت ۱
**چه شد:**
- **Task 1 (حذف تکرار):** بخش «فعالیت مالی اخیر» در UnifiedOverview که لیست تراکنش‌ها نشان می‌داد (تکراری با RecentList) به «وضعیت مالی» تبدیل شد — حالا فقط تعداد تراکنش‌های در انتظار تأیید را نمایش می‌دهد (عدد بزرگ amber یا پیام سبز «هیچ در انتظار نیست»). ArrowUpRight/ArrowDownLeft که دیگر استفاده نمی‌شدند از import حذف شدند.
- **Task 2 (علامت منفی):** در RecentList علامت `+`/`−` کنار مبلغ حذف شد — فقط رنگ (emerald/rose) تمیزسازی می‌کند. در BranchSummary برای موجودی از `Math.abs()` استفاده شد تا علامت منفی حذف شود و فقط رنگ rose نشانگر منفی باشد.
- **Task 3 (فرمت کوتاه):** KPICard حالا `formatMoneyShort(Math.abs(value))` نشان می‌دهد با `title` (عدد دقیق در hover). BranchSummary هم همین الگو برای income/expense/balance.
- **Task 4 (باگ شعب):** کد محاسبه `balance = income - expense` صحیح است. یکسانی عدد هزینه و |موجودی| برای A.S.P coincidence داده است (income صفر → |balance| = expense). با formatMoneyShort اکنون بهتر متمایز می‌شوند.
- **Task 5 (تغییر نام):** «کارآگاه مالی» → «دستیار مالی» در nav-config، permissions، anomaly/page، DetectivePane.
**فایل‌ها:** `components/dashboard/UnifiedOverview.tsx`, `RecentList.tsx`, `KPICard.tsx`, `BranchSummary.tsx`, `components/layout/nav-config.ts`, `lib/auth/permissions.ts`, `app/(app)/anomaly/page.tsx`, `components/settings/DetectivePane.tsx`
**Build:** tsc ✅ ۰ خطا · build ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** تست دستی داشبورد دسکتاپ+موبایل — بررسی KPI کوتاه، hover عدد دقیق، وضعیت مالی، BranchSummary.

## 📓 2026-07-09 — پنل استخدام v2 + باگ validation فرم (v0.10.2) — اکانت ۱
**چه شد:**
- **باگ fix**: فرم /apply خطای ۴۰۰ می‌داد چون schema سرور age/gender را اجباری می‌دانست ولی form-builder آن‌ها را optional تعریف کرده. هر دو `.optional().nullable()` شدند. باگ `age: age ?? 0` (ارسال صفر به جای undefined) هم رفع شد.
- **Task 1 (Collapse)**: هدر فشرده‌تر — نام+وضعیت+بخش+سن+تاریخ+اولین ۲ شیفت در ردیف‌های خوانا. Chevron نشانگر باز/بسته. کارت‌ها پیش‌فرض بسته.
- **Task 2 (Q&A hierarchy)**: هر سوال‌وجواب در یک box با `bg-stone-50 rounded-lg` — سوال کم‌رنگ بالا، جواب برجسته پایین. سوال‌های بدون جواب نمایش داده نمی‌شوند.
- **Task 3 (امتیاز سریع)**: ۵ ستاره روی هدر هر کارت — کلیک بدون باز کردن جزئیات ثبت می‌شود. مرتب‌سازی بر اساس امتیاز (نزولی) در dropdown اضافه شد.
- **Task 4 (URL فیلترها)**: وضعیت/بخش/زمان/جستجو/مرتب‌سازی در query string — رفرش URL را حفظ می‌کند.
- **Task 5 (مقایسه)**: دکمه «مقایسه» در هدر، چک‌باکس روی کارت‌ها (فقط در حالت مقایسه)، modal جدول مقایسه‌ای (ردیف=فیلد، ستون=داوطلب) با همه فیلدهای کلیدی + پاسخ سوال‌ها.
- **Task 6 (Excel)**: تأیید شد — از `sorted` استفاده می‌کند (فیلترشده+مرتب‌شده) — هیچ باگی نبود.
- **Task 7 (تگ کلمات کلیدی)**: ۶ تگ خودکار (فشاری/شلوغی/صبور/تیمی/باتجربه/مشتری‌مدار) از regex روی متن پاسخ‌ها — chip‌های رنگی زیر نام در هدر.
**فایل‌ها:** `app/(app)/recruitment/page.tsx` (بازنویسی کامل)، `lib/validations/recruitment.ts` (age/gender optional)، `app/apply/page.tsx` (age fix + field error parse)
**Build:** tsc ✅ ۰ خطا · build ✅ · 48 unit tests ✅
**ناتمام:** —. Branch: `feat/recruitment-panel-v2` — منتظر تست و merge.
**برای جلسه‌ی بعد:** Merge branch به main. Seed فرم از `/recruitment/form-builder` (اگر هنوز نشده).

## 📓 2026-07-08 — HR UX بهبود پنل استخدام (v0.10.1) — اکانت ۱
**چه شد:** ۵ بهبود P1–P5 در ماژول استخدام، بدون تغییر schema:
- **P1a (سوال کامل)**: در detail card کاندید، label سوال از `q.title` (کوتاه) به `q.prompt` (متن کامل) تغییر یافت — HR دقیقاً می‌داند هر جواب به کدام سوال است.
- **P1b (طراحی card)**: اطلاعات کلیدی (سن، جنسیت، محله، شیفت‌ها، زمان شروع، آشنایی) به‌صورت chips رنگی چیده می‌شوند — سریع‌خوانی بالاتر، سلسله‌مراتب بهتر.
- **P2 (حل ~7MB payload)**: `resumeUrl` از GET list API حذف شد (base64 تا 6MB بود!) — فقط `hasResume: boolean` برمی‌گردد. Pagination 50تایی اضافه شد + دکمه «بارگذاری بیشتر» در UI.
- **P3 (رزومه موبایل)**: endpoint جدید `GET /api/recruitment/[id]/resume` با `Content-Disposition: attachment` — دکمه دانلود از `<a href={dataURI}>` به `<a href={/api/...}>` تغییر یافت (Safari iOS سازگار).
- **P4 (error state در /apply)**: loading spinner + error message + دکمه «تلاش مجدد» برای fetch ساختار فرم اضافه شد.
**فایل‌ها:** `lib/recruitment/questions.ts` (حذف resumeUrl از interface)، `app/api/recruitment/route.ts` (GET — pagination، حذف resumeUrl)، `app/api/recruitment/[id]/resume/route.ts` (جدید)، `store/slices/recruitmentSlice.ts` (pagination + loadMore)، `app/(app)/recruitment/page.tsx` (P1+P2+P3)، `app/apply/page.tsx` (P4)
**Build:** tsc ✅ ۰ خطا · build ✅ · 48 unit tests ✅
**ناتمام:** Seed فرم هنوز اجرا نشده. Branch: `fix/recruitment-hr-ux` — منتظر تست و merge.
**برای جلسه‌ی بعد:** ۱. تست `/apply` + پنل استخدام. ۲. Seed از `/recruitment/form-builder`. ۳. Merge branch به main.

## 📓 2026-07-08 — Form Builder داینامیک استخدام (v0.10.0) — اکانت ۱
**چه شد:** فرم‌ساز داینامیک کامل پیاده شد — کنترل ۱۰۰٪ فرم `/apply` از داشبورد بدون کدنویسی:
- **Schema (4 جدول جدید):** `form_sections`, `form_fields`, `form_field_options`, `form_field_conditions` + ۲ ستون جدید به `job_applications` (`custom_fields` JSONB، `field_snapshot` JSONB). Migration: `db-form-builder-migration.sql` + `drizzle/migrations/0002_form_builder.sql`.
- **Seed API:** `POST /api/recruitment/form-builder/seed` — همه فیلدهای فعلی فرم را به عنوان seed اولیه وارد می‌کند (نام، موبایل، سن، جنسیت، محله، شیفت، شروع، آشنایی + شرط «توضیح آشنایی» برای «سایر»). یک‌بار در pgAdmin چک و بعد از seed UI اجرا شود.
- **API‌های CRUD فرم‌ساز:** GET/POST فیلد، PATCH (label+options+conditions یکجا)، DELETE (غیرفعال‌سازی نرم)، PUT reorder (drag-to-reorder + جابه‌جایی بین مراحل)، CRUD مراحل.
- **API عمومی فرم:** `GET /api/recruitment/form-structure?area=hall|kitchen` — فیلدهای فعال با فیلتر scope و شرط‌ها.
- **فرم‌ساز UI:** `/recruitment/form-builder` — درخت فیلدها + ویرایشگر ۴ تب (پایه/گزینه‌ها/شرایط/اعتبارسنجی) + پیش‌نمایش زنده موبایل/دسکتاپ + drag-to-reorder با HTML5 native.
- **فرم `/apply` کاملاً داینامیک:** مرحله ۱ از DB رندر می‌شود، موتور شرط‌ها client-side، ولیدیشن از `field.validation` JSON، `customFields` و `fieldSnapshot` در submit ذخیره می‌شود.
- **پنل `/recruitment` داینامیک:** نمایش `customFields` با label از snapshot، فیلترهای داینامیک برای filterable fields، اکسل با ستون‌های داینامیک.
**فایل‌ها:** `lib/db/schema.ts` (4 جدول جدید + 2 ستون)، `lib/recruitment/form-types.ts` (جدید)، `lib/recruitment/questions.ts` (JobApplication type)، `lib/validations/recruitment.ts` (customFields)، `app/api/recruitment/route.ts`، `app/api/recruitment/form-structure/route.ts` (جدید)، `app/api/recruitment/form-builder/route.ts` (جدید)، `app/api/recruitment/form-builder/fields/route.ts` (جدید)، `app/api/recruitment/form-builder/fields/[id]/route.ts` (جدید)، `app/api/recruitment/form-builder/reorder/route.ts` (جدید)، `app/api/recruitment/form-builder/seed/route.ts` (جدید)، `app/api/recruitment/form-builder/sections/route.ts` (جدید)، `app/api/recruitment/form-builder/sections/[id]/route.ts` (جدید)، `app/(app)/recruitment/form-builder/page.tsx` (جدید)، `app/(app)/recruitment/page.tsx`، `app/apply/page.tsx`، `db-form-builder-migration.sql` (جدید)، `drizzle/migrations/0002_form_builder.sql` (جدید)
**Build:** tsc ✅ ۰ خطا · build ✅ · 48 unit tests ✅
**ناتمام:** migration هنوز در pgAdmin اجرا نشده، seed هنوز اجرا نشده — UI آماده است.
**برای جلسه‌ی بعد:** ۱. اجرای `db-form-builder-migration.sql` در pgAdmin. ۲. رفتن به `/recruitment/form-builder` و زدن «بارگذاری داده اولیه». ۳. تست سناریوی کامل (ساخت فیلد جدید، شرط‌گذاری، submit از /apply، مشاهده در پنل و اکسل).


