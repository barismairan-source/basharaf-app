# HANDOFF.md — دفتر وضعیت زنده‌ی پروژه «با شرف»

> این فایل **دفتر رله‌ی بین دو اکانت Claude Code** است که نوبتی روی همین پوشه کار می‌کنند.
> قانون طلایی: **هر جلسه اول بخش ۰ را بخوان؛ آخر جلسه بخش ۰ + ژورنال را به‌روز کن و commit/push کن.**
> جزئیات تاریخی قدیمی‌تر: `project-docs/handoff-archive.md` (اگر نبود، اولین جلسه بسازد).

---

## ⚡ بخش ۰ — وضعیت لحظه‌ای (اول این را بخوان)

| | |
|---|---|
| **نسخه** | `9.1.0` |
| **آخرین به‌روزرسانی** | 2026-06-11 — اکانت: ۲ |
| **Build/tsc** | tsc سبز ✅ (۰ خطا، ۲ بار تأیید) — `npm run build` در این ماشین/محیط گیر می‌کند ⚠️ (جزئیات در ژورنال زیر؛ به‌نظر مشکل محیطی است نه کد) |
| **دیپلوی** | Vercel+Supabase کامل کار می‌کند ✅ — Liara: فیکس `28P01` اعمال شد، `v9.1.0/basharaf-deploy.zip` آماده‌ی deploy (هنوز روی production لیارا تست نشده) |
| **کار نیمه‌تمام (in-progress)** | (۱) تأیید فیکس `28P01` روی production لیارا — نیاز به deploy واقعی `v9.1.0/basharaf-deploy.zip` توسط کاربر و گزارش نتیجه. (۲) تأیید `npm run build` برای ۶ فیکس این جلسه روی یک محیط دیگر (چون در این ماشین گیر می‌کند). |
| **کار بعدی پیشنهادی** | اول `npm run build` را روی محیط دیگر/production برای ۶ فیکس این جلسه تأیید کن. اگر لیارا هم OK شد → Backlog #5 (اجرای واقعی integration tests با DATABASE_URL تستی) یا Backlog #6؛ اگر باز `28P01` بود → بررسی دقیق‌تر username/host در connection string کاربر |
| **بلاک‌شده/منتظر کاربر** | deploy کردن `v9.1.0/basharaf-deploy.zip` روی لیارا و گزارش نتیجه‌ی اتصال DB؛ گزارش نتیجه‌ی `npm run build` روی محیط دیگر |

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

## 📓 2026-06-11 — رفع ۶ باگ گزارش‌شده (۴۰۱ سراسری، RTL منفی، استخدام→پرسنل، مانده طرف‌حساب، UI موبایل، کارتابل انبار) — اکانت ۲
**چه شد:**
(۱) **۴۰۱ سراسری:** وقتی session منقضی می‌شد، هر slice جدا خطا را catch می‌کرد (معمولاً آرایه خالی) → کاربر صفحه‌ی خالی/صفر می‌دید بدون اطلاع از نیاز به ورود مجدد. فایل جدید `lib/auth/sessionExpiry.ts`: `window.fetch` یک‌بار patch می‌شود؛ هر ۴۰۱ از `/api/*` (به‌جز تلاش لاگین و مسیرهای عمومی `/login,/signup,/forgot,/apply,/m`) → `user=null` + ریدایرکت به `/login`. در `SessionSync.tsx` پیش از `bootstrap()` نصب می‌شود.
(۲) **فرمت اعداد منفی RTL:** ارقام فارسی bidi نوع AN هستند و علامت منفی با آن‌ها ترکیب نمی‌شود → در متن RTL سمت چپ می‌افتاد (مثلاً «۱۰۰-» به‌جای «-۱۰۰»). در `fmt()` (`lib/utils.ts`)، برای مقادیر منفی بلوک «−عدد» بین Left-to-Right Isolate / Pop Directional Isolate (U+2066…U+2069) محصور شد.
(۳) **همگام‌سازی استخدام→پرسنل:** تأیید درخواست استخدام (`status='accepted'`) پرونده‌ی پرسنلی نمی‌ساخت. در `PATCH /api/recruitment/[id]` حالا یک `db.transaction` اجرا می‌شود: اگر برای اولین‌بار به `accepted` تغییر کند (idempotent با چک شماره تلفن در `employees`)، رکورد پرسنلی با نام/تلفن/جنسیت از فرم استخدام و نقش پیش‌فرض بر اساس `area` (`kitchen→cook`, `hall→waiter`, else→`other`) ساخته می‌شود.
(۴) **مانده‌ی طرف‌حساب صفر می‌ماند:** بعد از approve/create/delete تراکنش، موجودی صندوق سرور به‌روز می‌شد ولی لیست طرف‌حساب‌ها (نسیه) در UI رفرش نمی‌شد. `refreshAccounts()` در `store/index.ts` حالا علاوه بر `loadAccounts()`، `loadContacts()` را هم صدا می‌زند. در `transactionsSlice.ts`: بعد از create وقتی تراکنش بلافاصله `approved` است (مسیر ادمین) و بعد از delete یک تراکنش `approved`، `refreshAccounts()` صدا زده می‌شود.
(۵) **سرریز UI موبایل:** در صفحات «حساب‌ها» و «تراکنش‌ها»، هدر و کارت‌های خلاصه با اعداد بزرگ در صفحه‌های باریک سرریز می‌کردند. اضافه شد: `flex-wrap` روی هدرها، `min-w-0`+`truncate` روی کانتینرهای عدد، سایز فونت ریسپانسیو (`text-[14px] sm:text-[18px]`، `text-[22px] sm:text-[28px]`)، و padding صفحه `p-6`→`p-4 lg:p-6`.
(۶) **تعامل عجیب کارتابل انبار:** در «ثبت برگه» (و فرم‌های مشابه)، با هر کلید روی input عددی، رشته دوباره با `toLocaleString('en-US')` فرمت می‌شد؛ چون طول رشته (با اضافه/حذف کاما) عوض می‌شود، مرورگر موقعیت cursor را بر اساس اندیس کاراکتر نگه می‌داشت نه «چندمین رقم» → حین تایپ ارقام وسط عدد می‌پریدند. تابع جدید `formatNumericInputValue()` در `lib/utils.ts` موقعیت cursor را بر اساس تعداد رقم‌های قبل از آن حفظ می‌کند؛ در `app/(app)/inventory/page.tsx` روی ۵ ورودی عددی جایگزین شد (مقدار/بهای واحد در ثبت برگه، قیمت فروش رسپی، مقدار ماده‌ی رسپی، مبلغ کل خرید سریع).

**فایل‌ها:** `lib/auth/sessionExpiry.ts` (جدید)، `components/auth/SessionSync.tsx`، `lib/utils.ts` (+`fmt` RTL، +`formatNumericInputValue`)، `app/api/recruitment/[id]/route.ts`، `store/index.ts`، `store/slices/transactionsSlice.ts`، `app/(app)/accounts/page.tsx`، `app/(app)/transactions/page.tsx`، `app/(app)/inventory/page.tsx`.

**Build:** `npx tsc --noEmit` ✅ ۰ خطا (۲ بار تأیید شد، یک‌بار قبل و یک‌بار بعد از فیکس #۶). `npm run build` ❌ — در این ماشین/محیط، **سه تلاش پشت‌سرهم** (با sandbox + با `NEXT_TELEMETRY_DISABLED`، با sandbox + بدون آن، و کاملاً بدون sandbox) دقیقاً در همان نقطه گیر کردند: فقط بنر `▲ Next.js 14.2.15` چاپ می‌شود و بعد فرآیند برای ده‌ها دقیقه (یک تلاش تا ۴۵ دقیقه صبر شد) با CPU≈۰٪ و RSS ثابت (~۱۱۰MB) بی‌حرکت می‌ماند — `sample` نشان داد همه‌ی threadها روی `psynch_cvwait`/`kevent` idle هستند، بدون هیچ I/O شبکه یا فایل جدید در `.next`. پروژه از `next/font/local` استفاده می‌کند (نه google fonts)، `instrumentation.ts`/`postbuild` hook ندارد، و `.next/cache/webpack/*-production` از یک build قبلیِ موفق هنوز موجود است — یعنی build قبلاً کامل شده بوده. تشخیص: مشکل محیطیِ همین ماشین است، نه از این ۶ فیکس (هیچ‌کدام config/dependency/route جدید اضافه نکردند). **به تأیید صریح کاربر**، commit/push فقط با تأیید tsc انجام شد.

**ناتمام:** تأیید `npm run build` برای این ۶ فیکس — باید روی یک محیط دیگر (ماشین دیگر، یا مستقیماً سرور deploy لیارا/Vercel) انجام شود.

**برای جلسه‌ی بعد:** اول `npm run build` را برای commit فعلی روی محیط دیگری امتحان کن. اگر سبز بود، خیال همه راحت است و می‌توان به Backlog ادامه داد. اگر همان‌جا هم گیر کرد، شک به یک پکیج/نسخه‌ی Node خاص برو (`rm -rf .next node_modules/.cache && npm run build`، یا `next build --debug`). جدا از این، deploy `v9.1.0/basharaf-deploy.zip` روی لیارا هنوز توسط کاربر تست نشده.

---

## 📓 2026-06-10 — رفع 28P01 لیارا + قرارداد انتشار نسخه‌دار (Backlog #4) — اکانت ۱
**چه شد:** ریشه‌ی خطای `28P01` لیارا پیدا شد: پارسر داخلی `postgres-js` برای جدا کردن host از userinfo از **اولین** `@` در connection string استفاده می‌کند نه آخرین؛ اگر پسورد auto-generated پنل لیارا شامل کاراکترهای خاص (`@ # % &`) باشد و percent-encode نشده باشد، host/user/pass اشتباه پارس می‌شوند → `28P01` حتی با پسورد درست در پنل. در `lib/db/client.ts` تابع `parseDatabaseUrl` اضافه شد: با یک regex حریصانه آخرین `@` قبل از host را پیدا می‌کند، user/pass/host/port/db را جدا می‌کند و به‌صورت آبجکت (نه رشته) به `postgres()` می‌دهد — این مسیر اصلاً وارد پارسر باگ‌دار نمی‌شود. پسورد چه percent-encode شده چه raw درست خوانده می‌شود (دستی با ۶ نمونه‌ی ادج‌کیس شامل `@ # / %` تست شد). منطق auto-detect SSL/`DATABASE_SSL` و رفتار Vercel+Supabase دست‌نخورده ماند. مستندسازی در `DEPLOY-LIARA.md` (بخش عیب‌یابی) اضافه شد.
همچنین **قرارداد انتشار نسخه‌دار** جدید برقرار شد: هر release یک پوشه‌ی `vX.Y.Z/` در ریشه (مطابق `package.json.version`) شامل `basharaf-deploy.zip` (خروجی `git archive HEAD` — بدون node_modules/.next/.git) به‌علاوه‌ی فایل(های) migration جدید یا `NO_SQL_MIGRATION_REQUIRED.txt`. `package.json` از `9.0.0` به `9.1.0` ارتقا یافت تا با این قرارداد هم‌راستا شود.
**فایل‌ها:** `lib/db/client.ts` (+`parseDatabaseUrl`)، `DEPLOY-LIARA.md` (+بخش عیب‌یابی `28P01`)، `package.json` (نسخه `9.1.0`)، `v9.1.0/basharaf-deploy.zip` + `v9.1.0/NO_SQL_MIGRATION_REQUIRED.txt` (جدید، خارج از کنترل git به‌جز فایل marker).
**Build:** tsc سبز ✅ (۰ خطا) / build سبز ✅
**ناتمام:** فیکس روی production لیارا تست نشده — نیاز به deploy واقعی توسط کاربر و گزارش نتیجه.
**برای جلسه‌ی بعد:** کاربر `v9.1.0/basharaf-deploy.zip` را روی لیارا deploy کند. اگر اتصال DB موفق شد → Backlog #5 (اجرای واقعی integration tests) یا Backlog #6. اگر باز هم `28P01` بود → username/host دقیق connection string کاربر را بررسی کن (نه فقط فرمت پسورد).

## 📓 2026-06-10 — integration tests برای balance guardها (Backlog #5) — اکانت ۱
**چه شد:** سه سناریوی Backlog #5 با Node.js test runner داخلی (`node --test` از طریق `tsx` — صفر وابستگی جدید) پیاده شد: (A) DELETE اتمیک یک تراکنش approved → reverse کامل صندوق، مانده‌ی طرف‌حساب، موجودی انبار (`qtyBase`) و حذف سند COGS + ثبت ردیف معکوس `inv_stock_tx`؛ (B) PATCH فیلد مالی روی approved → 422 `FINANCIAL_FIELDS_IMMUTABLE_AFTER_APPROVAL` (شامل تست «فقط حضور کلید کافی است، حتی با همان مقدار»)؛ (C) PATCH فیلد غیرمالی (note/receipt/categoryId) روی approved → ۲۰۰، بدون اثر بر amount/balance. تست‌ها یک نمونه‌ی واقعی `next start` بالا می‌آورند، با لاگین واقعی کوکی session می‌گیرند و روی fixtureهای ایزوله با پیشوند `__INTEGRATION_TEST__` کار می‌کنند که در پایان کامل پاک می‌شوند. به دستور کاربر: روی production اجرا نشد، schema دست‌نخورد، هیچ SQL جدیدی لازم نشد. کل suite اگر `DATABASE_URL` ست نباشد با پیام فارسی skip می‌شود (تأیید شد: `npm run test:integration` بدون DB → exit 0، صفر تست اجراشده).
**فایل‌ها:** `tests/integration/transactions.test.ts`، `tests/integration/helpers/env.ts`، `tests/integration/helpers/server.ts`، `tests/integration/helpers/fixtures.ts`، `tests/integration/helpers/api.ts`، `package.json` (+اسکریپت `test:integration`).
**Build:** tsc سبز ✅ (۰ خطا) / build سبز ✅. اجرای واقعی تست‌ها روی DB واقعی هنوز تأیید نشده.
**ناتمام:** اجرا/تأیید این تست‌ها روی یک دیتابیس واقعی غیر-production — منتظر تصمیم کاربر برای محیط تست.
**برای جلسه‌ی بعد:** اگر DATABASE_URL تست آماده شد → `npm run build && npm run test:integration` و گزارش نتیجه. وگرنه Backlog #4 (Liara `28P01`).

## 📓 2026-06-10 — آدیت امنیتی Backlog #3 (_diag) — اکانت ۱
**چه شد:** اسکن کامل `app/api/` برای endpoint تشخیصی یا افشای credential. نتیجه: `/api/_diag` هرگز در این کدبیس وجود نداشته. تمام استفاده‌های `process.env` فقط در `lib/` و برای پیکربندی داخلی است — هیچ‌کدام در پاسخ HTTP بازگردانده نمی‌شوند. یک string literal در پیام خطای آپلود نام متغیر محیطی را ذکر می‌کند ولی مقدار را فاش نمی‌کند (مشکل نیست). هیچ کدی تغییر نکرد.
**فایل‌ها:** — (فقط آدیت، بدون تغییر کد)
**Build:** tsc سبز ✅ (بدون تغییر)
**ناتمام:** —
**برای جلسه‌ی بعد:** Backlog #5 — تست integration برای balance guardها.

## 📓 2026-06-10 — account selection در تأیید رسید خرید (Backlog #2) — اکانت ۱
**چه شد:** `postPurchaseToAccounting` جستجوی داخلی حساب را حذف کرد و `resolvedAccountId` را به‌عنوان آرگومان صریح دریافت می‌کند. approve route: `accountId` (optional uuid) به `bodySchema` اضافه شد؛ priority: body.accountId (validate) → first active account for branch → 422 `NO_ACTIVE_ACCOUNT`. UI: تأیید رسید (kind='in') modal انتخاب صندوق نشان می‌دهد (accounts از store، موجودی نمایشی)؛ سایر انواع بدون تغییر. `tsconfig.json`: `release-artifacts/` و `graphify-out/` از کامپایل خارج شدند.
**فایل‌ها:** `lib/inventory/postToAccounting.ts`، `app/api/inventory/vouchers/[id]/approve/route.ts`، `lib/repos/inventory.types.ts`، `lib/repos/inventory.api.ts`، `app/(app)/inventory/page.tsx`، `tsconfig.json`.
**Build:** tsc سبز ✅ / build سبز ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** Backlog #3 (حذف `/api/_diag` اگر هنوز هست) یا Backlog #5 (تست integration برای balance guardها).

## 📓 2026-06-10 — stocktake accounting entry (Backlog #1) — اکانت ۱
**چه شد:** تابع `postStocktakeToAccounting` به `lib/inventory/postToAccounting.ts` اضافه شد. در approve route، قبل از loop متغیر `stocktakeVarianceCost` تعریف شد؛ داخل loop به‌ازای هر خط `diff * pre.a` (WAC قبل از تأیید) انباشته می‌شود. بعد از loop، اگر مغایرت ≠ ۰، یک تراکنش با `accountId: null` ساخته می‌شود: کسری → expense «هزینه مغایرت انبارگردانی - فیش شماره X»، مازاد → income «درآمد تعدیل انبارگردانی - فیش شماره X». اتمیک با همان db.transaction؛ idempotent با linkedTransactionId؛ برگه با txId وصل می‌شود.
**فایل‌ها:** `lib/inventory/postToAccounting.ts` (+`postStocktakeToAccounting`)، `app/api/inventory/vouchers/[id]/approve/route.ts` (+import، +variance accumulator، +accounting call).
**Build:** tsc سبز ✅ / build سبز ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** account selection در خرید (Backlog #2) — انتخاب دستی صندوق هنگام ثبت برگه‌ی خرید به‌جای «اولین حساب فعال».

## 📓 2026-06-10 — سامان‌دهی commitهای CRM + cleanup — اکانت ۱
**چه شد:** همه‌ی فایل‌های uncommit از جلسات قبل (ماژول CRM + SQL migrationها) در دو commit منطقی جدا سامان‌دهی شدند. `*.zip` و `release-artifacts/` به `.gitignore` اضافه شد. tsc (۰ خطا) و build (سبز) تأیید شد. ژورنال‌های عقب‌افتاده بازسازی شدند و ۲ ورودی قدیمی به `project-docs/handoff-archive.md` منتقل شد.
**فایل‌ها:** ماژول CRM (customers/reservations/coupons/loyalty + sliceها)، `supabase-v5/v6/v7-migration.sql`، `customers-migration.sql`، `cleanup-rice.sql`، `CLAUDE.md`، `.claude/`، `package-lock.json`، `project-docs/financial-integrity-spec.md`، `.gitignore`، `HANDOFF.md`.
**Build:** tsc سبز ✅ / build سبز ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** stocktake accounting entry (Backlog #1) — مغایرت انبارگردانی در P&L ثبت شود. قبل از کد، طرح را تأیید کن.

---

## 📌 Backlog یکپارچه (به ترتیب اولویت)

### 🟠 فوری/مهم
1. ~~**stocktake accounting entry**~~ — ✅ انجام شد (2026-06-10، commit a90cd9d).
2. ~~**account selection در خرید**~~ — ✅ انجام شد (2026-06-10، commit 1a4c9f5).
3. ~~**چک `/api/_diag`**~~ — ✅ آدیت شد (2026-06-10): endpoint وجود ندارد، هیچ credential-ای در HTTP response فاش نمی‌شود.
4. ~~**Liara `28P01`**~~ — کد فیکس شد ✅ (2026-06-10، `lib/db/client.ts` +`parseDatabaseUrl`، `v9.1.0/basharaf-deploy.zip` آماده)؛ منتظر deploy واقعی کاربر روی لیارا برای تأیید نهایی.

### 🟡 متوسط
5. ~~**تست integration برای balance guardها**~~ — کد نوشته شد ✅ (2026-06-10، سه سناریوی A/B/C در `tests/integration/`، tsc/build سبز)؛ اجرای واقعی روی DB غیر-production هنوز انجام نشده — منتظر DATABASE_URL تستی از کاربر.
6. موارد 🟡 باقی‌مانده‌ی `project-docs/domain-audit.md`.
7. Seed منو روی دیتابیس تازه خالی است (۳۱ آیتم فقط در `supabase-v4-menu-migration.sql` آرشیوی).

### 🔵 ساختاری/بلندمدت
8. GL دوطرفه‌ی کامل — `journal_vouchers` فقط برای حقوق؛ هسته single-entry.
9. FIFO انبار — `expiryDate` ثبت می‌شود ولی موتور هزینه WAC است نه FIFO.
10. منو → POS — منو کاتالوگ است؛ backflushing فقط از تراکنش income دستی.
11. Password reset با ایمیل — پیاده نشده.
12. Rate-limit در حافظه — در multi-instance سراسری نیست.
13. وابستگی Realtime/Storage به Supabase — روی هاست خالص کار نمی‌کند.

### ❓ برای تأیید (جلسه‌ی بعدی با کد تطبیق دهد — ممکن است خطای مستندات باشد نه کد)
- لیست SQL بخش ۸، فایلی برای **`job_applications`** (استخدام)، **ستون `users.permissions`**، و **نقش `Warehouse`** ندارد. یا در `db-setup.sql` ادغام شده‌اند یا فایل‌هایشان (`db-recruitment-migration.sql`، `db-user-permissions.sql`، `db-warehouse-role.sql`) از لیست جا افتاده. تطبیق و این سند اصلاح شود.
- `@types/file-saver` یتیم است (خود `file-saver` نصب نیست) — حذف یا نصب.

---

# 📚 مرجع پایدار (کم‌تغییر — فقط وقتی معماری عوض شد به‌روز کن)

## ۱. Tech Stack

| لایه | ابزار |
|---|---|
| Framework | Next.js 14 (App Router) — `14.2.15` |
| Language | TypeScript strict |
| Database | PostgreSQL (Supabase-hosted) |
| ORM | Drizzle ORM `^0.36.1` + درایور `postgres` `^3.4.5` (خام؛ supabase-js برای داده نه) |
| Auth | JWT دست‌ساز — `jose` (HS256) + `bcryptjs` |
| State | Zustand (slice-based) `^4.5.5` |
| Styling | Tailwind CSS + tailwindcss-rtl |
| Supabase SDK | فقط Realtime (`lib/realtime/`) و Storage (`lib/storage/receipts.ts`, `resumes.ts`) |
| Forms | react-hook-form + zod |
| Charts | recharts · Export: xlsx · QR: qrcode |
| Date | react-multi-date-picker (جلالی) — `components/ui/JalaliDatePicker.tsx` |

## ۲. مدل داده — `lib/db/schema.ts` (۳۰+ جدول)

### قراردادهای کلیدی
- **پول:** `bigint({ mode: 'number' })` — تومان صحیح.
- **بهای واحد انبار:** `numeric(24,6)` (hotfix v4.1 برای سرریز).
- **تاریخ کاربری:** رشته‌ی جلالی `text`؛ **تاریخ سیستمی:** timestamptz.
- **PK:** `uuid().defaultRandom()` — استثنا: `menu_settings.id = integer(1)`.
- **نوع/وضعیت:** `text` با check (نه pgEnum جدید).
- **denormalization عمدی:** `branch_name`, `category_name` در تراکنش.

### جداول
**هسته (۱۳):** `branches`, `users` (role: text — SuperAdmin|BranchUser|Warehouse؛ permissions: jsonb), `categories`, `transactions` (+`saleMeta` jsonb), `notifications`, `app_settings`, `audit_log`, `accounts`, `contacts`, `system_logs`, `menu_categories`, `menu_items`, `menu_settings`.
**پرسنل/حقوق (۷):** `employees`, `employee_documents`, `payroll_events`, `payroll_parameters`, `payroll_runs` (draft→calculated→approved→posted), `payslips`, `journal_vouchers` (خطوط jsonb).
**انبار (۷):** `inv_items` (raw/prep، موجودی دولایه + WAC), `inv_recipes`, `inv_recipe_lines`, `inv_vouchers` (in/out/waste/sale/produce/stocktake), `inv_voucher_lines` (+`expiryDate`), `inv_stock_tx` (append-only), `inv_daily_sales`.
**استخدام (۱):** `job_applications`.
**مشتریان/وفاداری/رزرو (۷):** `customers`, `loyalty_entries` (اتمیک با SQL مستقیم), `coupons`, `coupon_redemptions` (race-safe با unique), `feedback`, `tables` (export: `restaurantTables`), `reservations` (state machine: pending→confirmed→seated→…).

## ۳. احراز هویت و مجوزها
- نقش‌ها: `SuperAdmin` (همه‌چیز) / `BranchUser` (شعبه‌ی خودش) / `Warehouse` (انبار شعبه‌ی خودش).
- **Section permissions:** `users.permissions: string[]` — SuperAdmin همیشه همه.
- **Capability:** پیشوند `cap:` — مثل `cap:inventory.approve`, `cap:inventory.viewCosts`.
- **اعمال فوری:** middleware با کش ۵ ثانیه از `/api/auth/permissions` می‌خواند (logout لازم نیست).
- سه لایه: `middleware.ts` (Edge) → API (`requireSession`/`requireAdmin`/`canDo`) → Client (نمایشی).
- منبع: `lib/auth/permissions.ts`.

## ۴. منطق مالی کلیدی
- **Single-entry** (هر transaction یک رکورد income/expense/transfer)؛ GL دوطرفه فقط در `journal_vouchers` حقوق.
- **اتمیک موجودی:** `lib/db/balanceHelpers.ts` — apply/reverse برای صندوق و طرف‌حساب. فقط `approved` اثر دارد.
- **PATCH immutability:** فیلدهای مالی پس از approved تغییرناپذیر (۴۲۲).
- **DELETE atomic rollback:** برگشت کامل صندوق + طرف‌حساب + کسر انبار فروش منو.
- **انبار↔حسابداری** (`lib/inventory/postToAccounting.ts`): تأیید خرید→هزینه+کسر صندوق؛ فروش→درآمد+افزایش؛ ضایعات→هزینه‌ی non-cash.
- **حقوق↔حسابداری** (`lib/payroll/postToBasharaf.ts`): posting → journal_voucher + تراکنش هزینه‌ی خالص.
- **Backflushing منو:** تأیید income فروش منو → کسر خودکار مواد طبق رسپی + COGS.
- **WAC:** هر تأیید خرید `avg_cost_per_base` را بازمحاسبه؛ `computeAutoRecost` نیمه‌آماده‌های متأثر را اتمیک recost می‌کند.
- **Yield:** هم فروش منو هم تولید (`produceConfirmed`) ضریب `100/yieldPct` اعمال می‌کنند (هم‌فرمول — رفع 2026-06-10).

## ۵. API Routes
**هسته:** `/api/auth/{login,logout,me,change-password,permissions}` · `/api/transactions` (+`[id]`, `[id]/approve|reject`, `import`, `import/template`) · `/api/accounts` (+`[id]`, `[id]/ledger`, `recalculate`) · `/api/contacts`, `/api/categories`, `/api/branches`, `/api/users` (CRUD) · `/api/notifications` · `/api/reports` · `/api/settings` (+`wipe` = Factory Reset فقط SuperAdmin) · `/api/export`, `/api/upload`, `/api/audit`, `/api/logs`, `/api/dashboard`.
**منو:** `/api/menu` (عمومی) · `items`, `categories`, `settings` (mutation).
**انبار:** `items` (+import/template) · `recipes` (+`[id]/costing`) · `vouchers` (+approve/reject, import/template) · `produce` · `stocktake` · `forecast` · `expiry` (هشدار انقضا — جدید 06-10).
**حقوق:** `employees` · `payroll/events` · `payroll/runs` (+calculate/approve/post).
**استخدام:** `recruitment` (+questions, upload).
**CRM:** `customers` · `coupons` (+validate) · `feedback` (+summary) · `tables` · `reservations`.

## ۶. صفحات UI — `app/(app)/`
`/dashboard` · `/transactions(+/new)` · `/accounts(+/[id])` · `/contacts` · `/reports` · `/employees` · `/payroll` · `/inventory` · `/menu` · `/recruitment` · `/customers` · `/reservations` · `/coupons` · `/logs` · `/settings`.
**خارج از app:** `/m` (منوی عمومی)، `/apply` (استخدام عمومی)، `/login`, `/signup`, `/forgot`.

## ۷. Zustand — ۱۸ slice
auth, transactions, users, refs, accounts, contacts, menu, notifications, appSettings, preferences (تنها persist‌شونده), ui, employees, payroll, recruitment, customers, coupons, reservations, feedback.

## ۸. Migrationها (idempotent)
`db-setup.sql` (هسته ۱۳ جدول) · `db-seed.sql` (۳ شعبه، ۴ کاربر، ۹ دسته، ۳ صندوق) · `db-inventory-migration.sql` · `db-payroll-migration.sql` · `db-stage-payroll-full.sql` · `customers-migration.sql` · `supabase-v5-menu-sale-deduction-migration.sql` (sale_meta) · `supabase-v6-waste-expiry-migration.sql` (expiry_date) · `supabase-v7-bigint-migration.sql` (numeric 24,6) · `db-role-to-text.sql` · `fix-categories.sql` · `supabase-logs-migration.sql`.
آرشیو: `migrations-archive/`. ⚠️ به آیتم «برای تأیید» در Backlog نگاه کن (فایل‌های recruitment/permissions/warehouse-role در این لیست نیستند).

## ۹. قابلیت‌های تأییدشده
JWT + RBAC سه‌لایه + rate-limit ورود · مجوز granular با اعمال فوری · CRUD همه‌ی ماژول‌ها · موجودی اتمیک + گردش حساب + بازسازی · PATCH immutability · DELETE atomic rollback · VAT، نسیه، گزارش، Excel · انبار WAC + recipe explosion + backflushing + waste GL · حقوق با بیمه/مالیات + posting · استخدام عمومی · CRM وفاداری/کوپن/رزرو · Factory Reset · منوی دیجیتال + QR + PWA + Realtime · لاگ مرکزی.

## ۱۰. اطلاعات عملیاتی (که نباید گم شود)
- **لاگین تست:** `admin@basharaf.app` / `basharaf123` (SuperAdmin).
- **Repo:** `github.com/barismairan-source/basharaf-app` (شاخه `main`).
- **JWT_SECRET باید ≥ ۳۲ کاراکتر باشد** — کمتر = لاگین کلاً خراب (درس پرهزینه‌ی گذشته).
- TS strict: `arr[0]` با گارد؛ `Record[key]` با `!` یا `?? fallback`؛ آیکن Lucide prop `dir` ندارد؛ enum از map نیاز به `as` cast.
- فایل route فقط متد HTTP و config export کند؛ helper در `lib/`.
- فایل‌های SQL: بایت اول `2d 2d` (خط تیره)؛ کامنت ASCII.
- روال هر تغییر: `npx tsc --noEmit` (۰ خطا) → `npm run build` → ژورنال + بخش ۰ → commit/push.

## ۱۱. وابستگی‌های کلیدی
next `14.2.15` · react `^18.3.1` · typescript `^5.6.3` · drizzle-orm `^0.36.1` · postgres `^3.4.5` · @supabase/supabase-js `^2.45.4` · jose `^5.9.6` · bcryptjs `^2.4.3` · zustand `^4.5.5` · zod `^3.23.8` · recharts `^3.8.1` · xlsx `^0.18.5` · qrcode `^1.5.4` · react-multi-date-picker `^4.5.2` · ⚠️ `@types/file-saver` یتیم.
