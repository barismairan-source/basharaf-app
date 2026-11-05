# HANDOFF.md — دفتر وضعیت زنده‌ی پروژه «با شرف»

> قانون طلایی: **هر جلسه اول بخش ۰ را بخوان؛ آخر جلسه بخش ۰ + ژورنال را به‌روز کن و commit/push کن.**
> جزئیات تاریخی قدیمی‌تر: `project-docs/handoff-archive.md`.

---

## ⚡ بخش ۰ — وضعیت لحظه‌ای (اول این را بخوان)

| | |
|---|---|
| **نسخه** | **production روی VPS پارس‌پک** = release `20261104-133518-920685` از branch `feat/staff-pay-shifts` (push نشده). اپ لیارا Stop؛ فقط دیتابیس لیارا مانده. |
| **آخرین به‌روزرسانی** | 2026-11-04 (مسیر کاری: `~/Claude-Projects/01-Active/basharaf-app` + worktree `~/Claude-Projects/_work/basharaf-next15`) |
| **Build/tsc** | روی `chore/next-15-upgrade`: tsc ✅ · unit 762/762 ✅ · lint ۰ خطا · build ✅ · build شبیه لیارا ✅ |
| **دیپلوی** | **`https://basharaf.me` روی VPS** (`94.184.45.140`؛ HTTPS تا 2027-01-31؛ `www` → 301؛ `vps.basharaf.me` هم سرو می‌شود). دیپلوی: `SITE=https://basharaf.me ops/server/deploy.sh` (push به main فقط CI تست، بدون لیارا). دیتابیس هنوز Postgres لیارا (آدرس عمومی). **outbox scheduler روشن روی VPS.** |
| **کار نیمه‌تمام (in-progress)** | ۱) استودیو رسپی (WIP commit‌نشده؛ ۱۰ صفحه placeholder، migrationها اجرا نشده، bootstrap بدون auth). |
| **کار بعدی پیشنهادی** | ۰) ادغام پرونده‌های تکراری فاطمه کلبادی‌نژاد و وارد کردن مهر او، ثبت دستمزد و لینک شخصی بقیه؛ اصلاح دائمی rewrite منو در middleware. ۱) VPS-09 انتقال دیتابیس به VPS (سرور ارتقا یافت؛ cluster جدا، نه Postgres مشترک meeez؛ اتصال خواندنی به production با تأیید علی). ۲) VPS-08 چرخش secretها. ۳) مرتب کردن DNS: رکورد `@` فعلاً CNAME → `vps.basharaf.me`. ۴) بعد از چند روز پایداری: حذف اپ لیارا (فقط با تأیید علی). |
| **یافته‌ی مهم این نشست** | ممیزی ۲۰۲۶-۱۰-۳۰: Chef/Warehouse در ۲۵ route به شعب دیگر دسترسی داشتند (رفع روی branch). گزارش کامل: `~/Claude-Projects/_audit/basharaf-app-audit.md`. |
| **بلاک‌شده/منتظر کاربر** | ۱) تأیید علی برای VPS-09. ۲) VPS-02 رمز root (علی: فعلاً مهم نیست). ۳) دو migration رزرو؛ تصمیم استودیو رسپی. |

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

## 📓 2026-11-04 — پنل پرسنل: ساختار حقوق و تب شیفت + جدول هفتگی و تنظیم حقوق برای مدیر — روی branch `feat/staff-pay-shifts`
**چه شد:** خواسته‌ی علی: هر نفر عنوان و جزئیات حقوق (ثابت و اضافه‌کاری) و شیفت‌هایش را شیک ببیند و مدیر راحت تنظیم کند. **پنل:** بلوک ساختار حقوق در کارت «تا امروز» (`describePayStructure`) و تب جدید «شیفت» (`MyWeekShifts`، هفته از شنبه). **مدیر:** تب پیش‌فرض «جدول هفتگی» در `/hr/time` (`ShiftWeekGrid`، پیش‌فرض‌ها در `lib/hr/shiftPresets.ts`: صبح ۱۰–۱۷، شب ۱۷–۰۰:۳۰ از عکس برنامه‌ی قدیمی؛ ساعت دلخواه؛ کپی از هفته‌ی قبل) و فرم «تنظیم حقوق» روی هر نفر در `/hr/staff` (`hr.compensation.manage`). جدول `staff_pay_settings` (migration `db-staff-pay-settings.sql`، با تأیید علی اجرا شد) مقدم بر ریز کارکرد در `resolveBasis`؛ `PUT /api/hr/staff-pay` نرخ ساعتی را هم از امروز هماهنگ می‌کند. release `20261104-133518-920685`.
**فایل‌ها:** `project-docs/migrations/db-staff-pay-settings.sql`، `lib/db/schema.ts`، `lib/auth/audit.ts`، `lib/staff-panel/{monthToDate,monthPayServer}.ts`، `lib/hr/shiftPresets.ts`، `app/api/hr/staff-pay/route.ts`، `app/(app)/hr/time/page.tsx`، `components/me/{MeClient,parts}.tsx`، `components/hr/{StaffOverview,ShiftWeekGrid}.tsx`، `tests/unit/staffMonthToDate.test.ts`.
**Build:** tsc ✅ · unit 783/783 ✅ · lint ✅ · build ✅ · deploy ✅ (ری‌استارت فوری) · جدول هفتگی و فرم حقوق در مرورگر باز و مقدار فرم درست (بدون ذخیره).
**ناتمام:** ذخیره‌ی فرم حقوق و افزودن شیفت روی production امتحان نشده (عمداً داده ساخته نشد). تب شیفت و کارت حقوق روی گوشی پرسنل دیده نشده. ساعت صبح/شب را علی تأیید کند. branch push نشده.
**ادامه (2026-11-05):** صفحه‌ی استاتیک سفارش‌گیر پرسنل به درخواست علی روی basharaf.me نصب شد: فایل‌ها در `/srv/basharaf-order-app/`، تنظیم nginx در `/etc/nginx/snippets/basharaf-order-app.conf` (include در بلوک basharaf.me؛ پشتیبان `/root/basharaf-nginx.before-order-app`). **آدرس عمداً اینجا نوشته نشده** چون این repo عمومی است؛ آدرس را فقط از همان فایل روی سرور بخوانید. برای تغییر منو: فایل‌ها را در همان پوشه عوض کن و VERSION در sw.js را بالا ببر؛ به دیپلوی برنامه ربطی ندارد. **هشدار: repo عمومی است** و این ژورنال نام پرسنل و مبلغ‌های حقوق دارد — منتظر تصمیم علی برای خصوصی کردن.
**برای جلسه‌ی بعد:** تست سرتاسری در مغازه؛ IP ثابت و غیرفعال کردن ۶ IP قدیمی؛ پرونده‌های تکراری؛ رسیدهای مهر.

## 📓 2026-11-03 (۲) — دسترسی موقت ثبت حضور (IP برای افراد خاص با انقضا) + رفع قطعی دیپلوی — روی branch `feat/clock-temp-networks`
**چه شد:** بررسی کل جریان پنل پرسنل با خواسته‌ی علی (لینک از پنل اصلی، فعال‌سازی هر جا، Face ID، صفحه‌ی صفاسیتی، حضور فقط با IP مغازه): همه ساخته شده بود؛ رمز اضافه نشد (به پیشنهاد ما). رفع شد: (۱) قطعی ۹۰ ثانیه‌ای هر دیپلوی (اتصال زنده‌ی داشبورد باز) → `TimeoutStopSec=10`؛ دیپلوی امروز بدون مکث ری‌استارت شد. (۲) `vps.basharaf.me` → 301 به `basharaf.me` و لینک شخصی با `NEXT_PUBLIC_APP_URL`. (۳) **قابلیت جدید به درخواست علی:** کنار IP ثابت مغازه، «دسترسی موقت»: یک IP برای چند نفر خاص (یا همه) و ۳۰ دقیقه تا ۲۴ ساعت؛ بعد از انقضا خودکار بی‌اثر و از فهرست حذف. migration `db-clock-temp-networks.sql` (دو ستون `employee_id`, `expires_at` + یکتایی فقط برای IP ثابت همگانی) با تأیید علی اجرا شد؛ `networkAppliesTo` در `rules.ts`، `matchBranchNetwork(ip, branch, employeeId)`، API و کارت «IP ثابت شعبه‌ها و دسترسی موقت» در «ورود با مودم». release `20261103-140630-778286`.
**فایل‌ها:** `project-docs/migrations/db-clock-temp-networks.sql`، `lib/db/schema.ts`، `lib/attendance-clock/{rules,service}.ts`، `app/api/clock/{status,punch}/route.ts`، `app/api/hr/clock/networks/route.ts`، `components/hr/ClockView.tsx`، `tests/unit/clockTempNetwork.test.ts`، `ops/server/basharaf.service`.
**Build:** tsc ✅ · unit 777/777 ✅ · lint ✅ · build ✅ · deploy ✅ · صفحه در مرورگر دیده شد (فرم و انتخاب افراد).
**ناتمام:** IP ثابت واقعی مغازه هنوز ثبت نشده؛ ۶ IP قدیمی (بیشترشان شبیه اینترنت همراه) هنوز فعال‌اند — علی در مغازه با «IP همین‌جا» ثابت را ثبت و بقیه را غیرفعال کند. ثبت حضور واقعی با دسترسی موقت تست نشده (فقط تست واحد). branch push نشده.
**برای جلسه‌ی بعد:** تست سرتاسری روی گوشی در مغازه (ورود/خروج → حضور پیش‌نویس → تأیید → «تا امروز»)؛ پرونده‌های تکراری (فاطمه کلبادی‌نژاد، کریم/صدرا ناطقیان).

## 📓 2026-11-03 — پنل پرسنل: «این ماه تا امروز» + نرخ ساعتی ۱۰ نفر — روی branch `feat/staff-month-pay`
**چه شد:** خواسته‌ی علی: پرسنل ساعت کار، روش محاسبه و حقوق تا امروزشان را ببینند. تصمیم‌های علی: آشپزخانه «حقوق ثابت ماه» و «اضافه‌کاری» جدا (چون جدا واریز می‌شوند)، حضور تأییدشده و منتظر تأیید جدا، نرخ‌ها از اکسل مهر، شیفت‌ها از این به بعد در سایت وارد می‌شوند. ساخته شد: `lib/staff-panel/monthToDate.ts` (خالص؛ همان قواعد `statements.ts`؛ مبنا = آخرین ریز کارکرد، وگرنه پرونده)، `lib/staff-panel/monthPayServer.ts`، `GET /api/me/month-pay` (Face ID)، کارت «… — تا امروز» در بخش حقوق پنل (`MonthToDateCard`)، «امروز تا الان X کار کرده‌اید» و لینک به حقوق در خانه. با تأیید علی ۱۰ نرخ در `employee_hourly_rates` از ۱ آبان (2026-10-23) ثبت شد (آشپزخانه حقوق÷۲۰۸، سالن حقوق÷۱۹۲؛ دلیل در ستون reason) — بدون نرخ، ورود/خروج گوشی به حضور تبدیل نمی‌شد (`NO_ACTIVE_RATE`). release `20261103-132059-a9de00`.
**فایل‌ها:** `lib/staff-panel/monthToDate.ts`، `lib/staff-panel/monthPayServer.ts`، `app/api/me/month-pay/route.ts`، `components/me/MeClient.tsx`، `tests/unit/staffMonthToDate.test.ts`.
**Build:** tsc ✅ · unit 774/774 ✅ · lint ✅ · build ✅ · deploy ✅.
**ناتمام:** branch push نشده (منتظر تأیید علی). **باگ دیپلوی:** توقف سرویس ۹۰ ثانیه timeout شد (احتمالاً setInterval زمان‌بند outbox پروسه را زنده نگه می‌دارد) → حدود ۹۰ ثانیه قطعی در هر دیپلوی؛ رفع: پاک کردن interval روی SIGTERM در `instrumentation-node.ts` یا `TimeoutStopSec`. نمای پنل از گوشی پرسنل تست نشده (فقط تست واحد). فاطمه کلبادی‌نژاد و صدرا ناطقیان نرخ ندارند (پرونده‌ی تکراری).
**ادامه (همان روز، با تأیید علی):** (۱) علت قطعی ۹۰ ثانیه: Next هنگام توقف منتظر بسته شدن همه‌ی اتصال‌ها می‌ماند و داشبوردِ بازِ یک مدیر (به‌روزرسانی زنده) اتصالی همیشه باز دارد → `TimeoutStopSec=10` در `ops/server/basharaf.service`، نصب روی سرور + `daemon-reload` (پشتیبان `/root/basharaf.service.before-timeout`؛ برنامه ری‌استارت نشد). (۲) `vps.basharaf.me` حالا فقط 301 به `basharaf.me` (فایل nginx سرور؛ پشتیبان `/root/basharaf-nginx.before-vps-redirect`؛ رکورد DNS vps نباید پاک شود چون `@` CNAME به آن است) تا لینک شخصی و Face ID همیشه روی نشانی اصلی ثبت شوند؛ `ClockView` هم لینک را با `NEXT_PUBLIC_APP_URL` می‌سازد (منتشر نشده، با دیپلوی بعدی). (۳) فهرست IP مغازه: ۶ نشانی فعال، بیشترشان شبیه اینترنت همراه (مشترک و متغیر) — منتظر جواب علی درباره‌ی IP ثابت یا روش QR.
**برای جلسه‌ی بعد:**  شیفت‌ها را علی از «برنامه شیفت» وارد می‌کند؛ اگر بخواهند، «تا امروز» در صفحه‌ی مدیر هم نشان داده شود.

## 📓 2026-11-02 (۲) — تاریخچه‌ی واریزی پرسنل + رفع منو و پنل پرسنل روی VPS — روی branch `feat/staff-payments`
**چه شد:** (۱) منوی مشتری `/safasity/menu` روی VPS ۵۰۰ می‌داد (rewrite در middleware به `https://localhost:3001`) → rewrite در `ops/server/nginx-basharaf-proxy.conf`. (۲) پنل پرسنل ۵۰۰ می‌داد (جدول `staff_statements` نبود) → با اجازه‌ی علی migration اجرا و ریز کارکرد مهر ۱۰ نفر وارد شد. (۳) **قابلیت جدید «تاریخچه‌ی واریز»** به تصمیم علی (جدا از حسابداری): جدول `staff_payments` (migration `db-staff-payments.sql`، بدون شبا)، `GET /api/me/payments` (با Face ID) و `GET /api/hr/staff-payments?employeeId=` (`hr.compensation.view` + شعبه)، جمع واریز ماه در `staff-overview`، نمایش در بخش «حقوق» پنل (`PaymentHistory` در `MeClient`) و Sheet «تاریخچه‌ی واریز» در `/hr/staff`. وارد کردن با `scripts/staff-payments-sql.ts --manifest` (هر فایل بانک: ماه، نوع، تاریخ، رسید دارد/ندارد). با تأیید علی: جدول ساخته شد، release `20261102-164716-963979` منتشر شد و **شهریور از ۴ رسید بانکی** وارد شد: ۱۷ ردیف (مرداد/«انتقال گروهی ۳ شهریور» ۴ ردیف ۹۵م، حقوق شهریور ۱۰ ردیف ۱۸۹٫۳م، اضافه‌کاری شهریور ۳ ردیف ۳۳٫۸م)؛ ۸ ردیف کیمیا وحدی/سجاد موسولی/فاطمه کلبادی‌نژاد (پرونده‌ی تکراری) رد شد.
**فایل‌ها:** `project-docs/migrations/db-staff-payments.sql`، `lib/db/schema.ts`، `lib/staff-panel/payments.ts`، `app/api/me/payments/route.ts`، `app/api/hr/staff-payments/route.ts`، `app/api/hr/staff-overview/route.ts`، `components/me/MeClient.tsx`، `components/hr/StaffOverview.tsx`، `scripts/staff-payments-sql.ts`، `tests/unit/staffPayments.test.ts`، `ops/server/nginx-basharaf-proxy.conf`.
**Build:** tsc ✅ · unit 769/769 ✅ · lint ✅ (فقط هشدار قدیمی) · build ✅ · deploy ✅ · `/hr/staff` ۱۰ نفر تاریخچه دارند (بررسی در مرورگر).
**ناتمام:** branch `feat/staff-payments` روی سرور منتشر شده ولی push/merge به main نشده (منتظر تأیید علی). «انتقال گروهی ۳ شهریور» موقتاً «حقوق مرداد» ثبت شد — علی تأیید کند بابت چه بود. مهر: رسیدها هنوز نرسیده (فایل‌های بانک: batch حقوق ۱۳ نفر، اضافه‌کاری ۵ نفر، تکمیلی روشا). آبان: «حقوق پایه» تا تأیید علی وارد نشود.
**ادامه:** به درخواست علی («همه تست بود») هر ۵ گوشی فعال پنل/Face ID از طریق خود برنامه لغو شد (`DELETE /api/hr/clock/links/[id]`، با audit): امیرمحمد، دینا، روشا، هستی و پرونده‌ی غیرفعال «امیر خرسندیان». ۱۴ رویداد ورود/خروج تست (۲۸ مهر تا ۷ آبان) پاک **نشد** (حذف دائم داده؛ در حقوق اثری ندارد). یک لینک شخصی تازه به نام **امیرمحمد خرسندیان** فقط برای پیش‌نمایش علی ساخته شد (تا 2026-11-05)؛ بعد از دیدن، لینک اصلی امیرمحمد باید دوباره ساخته شود (گوشی علی خودکار لغو می‌شود). «صدرا ناطقیان» و «کریم ناطقیان» احتمالاً یک نفرند (داده‌ها به «کریم» رفته).
**برای جلسه‌ی بعد:** بعد از رسیدن رسیدهای مهر: manifest مهر بساز (`kind`/`paidOn`/`hasReceipt`) → `npx tsx scripts/staff-payments-sql.ts --manifest … --dir "…/حقوق/واریزی" --out <scratchpad>` → `psql -f` از سرور → پاک کردن فایل SQL. بعد از ادغام پرونده‌های تکراری، manifest شهریور را دوباره اجرا کن (source_key → تکرار نمی‌شود). STAFF-PANEL.md در checkout اصلی تغییر commit‌نشده‌ی دیگران دارد؛ شرح این قابلیت بعداً به آن اضافه شود.

## 📓 2026-11-02 — سوئیچ basharaf.me به VPS پارس‌پک (برنامه؛ دیتابیس هنوز لیارا) — روی branch `ops/vps-deploy`
**چه شد:** تست با ورود مدیر روی vps (فقط خواندنی) سبز. علی تصمیم گرفت دو مرحله‌ای: اول برنامه، بعد دیتابیس (بعد از ارتقای سرور). Claude با ورود خود علی در مرورگر داخلی، در CDN پارس‌پک: TTL رکورد `@` → ۱ دقیقه، رکورد جدید `A www → 94.184.45.140` (۲ دقیقه، بدون پروکسی)، و بعد (به درخواست علی «همین الان») رکورد `@` (CNAME؛ نوعش در پنل قابل تغییر نیست) از `sahand.liara.cloud` به `vps.basharaf.me`. روی سرور `switch-main.sh` (فقط فایل nginx با‌شرف؛ پشتیبان `/root/basharaf-nginx.before-switch.*`): بلوک‌های basharaf.me/www اضافه شد بی‌آنکه vps قطع شود، گواهی Let's Encrypt `basharaf.me` + `www` (تا 2027-01-31). `APP_URL`/`NEXT_PUBLIC_APP_URL` → `https://basharaf.me` (پشتیبان `*.before-main-switch.bak`) و release `20261102-140407-72fcbe` ساخته و زنده شد. job `deploy` لیارا در CI با `if: false` غیرفعال شد (`1a9a270`).
**فایل‌ها:** `.github/workflows/liara.yml`، `HANDOFF.md`، `project-docs/handoff-archive.md` · سرور: `/etc/nginx/sites-available/basharaf`، `/etc/basharaf/{env,build.env}`، `/root/basharaf-ops/switch-main.sh` · Mac: `~/Claude-Projects/_work/basharaf-server{,.build}.env`.
**Build:** deploy.sh سبز (tsc/lint/vitest محلی + build سرور). `https://basharaf.me` و `/login /apply /reserve /me /clock /pay` ۲۰۰، `/dashboard` → login، www → 301، meeez سالم، حافظه آزاد ۱.۴ گیگ.
**ناتمام:** cache بعضی resolverها (مثل 1.1.1.1) تا ~۱ ساعت هنوز IP لیارا می‌دهد → لیارا روشن بماند (همان دیتابیس، بی‌خطر). بعد: Stop لیارا (علی) → حذف `OUTBOX_SCHEDULER=off` و restart. push به main منتظر تأیید علی.
**ادامه (همان روز):** push به main با تأیید علی (`ecfdeda..4c1be51`؛ CI بدون job لیارا). ساعت ۱۴:۴۷ علی اپ لیارا را Stop کرد (`basharaff.liara.run` → ۵۰۳). `OUTBOX_SCHEDULER=off` از `/etc/basharaf/env` حذف شد (پشتیبان `env.before-scheduler-on.bak`) و `systemctl restart basharaf`؛ scheduler روشن، لاگ بدون خطا، basharaf.me ۲۰۰، meeez سالم. نکته: resolver 1.1.1.1 تا ~۱۵:۱۰ هنوز IP لیارا می‌داد (کاربران کمی ممکن است تا آن موقع خطا دیده باشند).
**ارتقای سرور (همان روز):** با تأیید علی پلن پارس‌پک irCloud2 → irCloud3 (علی؛ ۱۴۲٬۸۶۰ تومان) → **irCloud4** (Claude؛ ۲۸۱٬۹۱۰ تومان از اعتبار): **۲ هسته، ۴ گیگ رم، ۶۰ گیگ دیسک**؛ هر بار ری‌استارت کوتاه (۱۰–۴۰ ثانیه). بعد از آن nginx/postgres/meeez/basharaf/darayi همه active، basharaf.me ۲۰۰، scheduler روشن. همچنین به درخواست علی رکورد `A darayi.meeez.me → 94.184.45.140` (بدون پروکسی) در CDN `meeez.me` ساخته شد (پروژه‌ی darayi؛ گواهی‌اش هنوز گرفته نشده).
**باگ‌های پیدا‌شده بعد از سوئیچ (همان روز):** (۱) **منوی مشتری** `/safasity/menu` و `/safasity/menu/birun` روی VPS ۵۰۰ می‌داد: middleware با `new URL('/m', request.url)` rewrite می‌کند و پشت nginx آدرس می‌شود `https://localhost:3001/m` → `EPROTO`. رفع فوری با تأیید علی: همان rewrite در `ops/server/nginx-basharaf-proxy.conf` (`location ^~ /safasity/menu`؛ پشتیبان سرور `/root/basharaf-proxy.conf.before-menu-fix`)، `nginx -t` و reload؛ حالا ۲۰۰. اصلاح دائمی در کد هنوز مانده. (۲) **پنل پرسنل** (`/hr/staff` و ریز کارکرد `/me`): `relation "staff_statements" does not exist` — migration `project-docs/migrations/db-staff-statements.sql` (فقط یک جدول خالی) هیچ‌وقت روی production اجرا نشده؛ با اجازه‌ی صریح علی Claude از سرور با `psql -1 -f` اجرا کرد (جدول خالی + ۲ index). `/hr/staff` حالا ۲۰۰: ۱۳ پرسنل، ۴ پنل فعال، آبان بدون حضور ثبت‌شده، دستمزد ۱۲ نفر ثبت نشده، **نفر تکراری** «فاطمه کلبادی‌نژاد» / «فاطمه کلبادی نژاد» (با و بی نیم‌فاصله). ریز کارکرد **مهر ۱۴۰۵** با تأیید علی وارد شد (`scripts/staff-statements-sql.ts` → `psql -1`؛ فایل SQL حاوی حقوق پاک شد): **۱۰ نفر، جمع ۲۲۹٬۰۵۳٬۰۰۰ تومان**؛ در `/api/hr/staff-overview?period=1405-07` هر ۱۰ نفر statement دارند. رد شدند (بیش از یک پرونده): کیمیا وحدی و سجاد موسولی (هر کدام ۲ پرونده‌ی غیرفعال)، فاطمه کلبادی‌نژاد (۳ پرونده: ۲ فعال، ۱ غیرفعال) — بعد از ادغام پرونده‌ها جدا وارد شود.
**برای جلسه‌ی بعد:** برگشت اضطراری: رکورد `@` در CDN پارس‌پک → `sahand.liara.cloud` و Start اپ لیارا + `OUTBOX_SCHEDULER=off` روی VPS (تا پیام دوبار نرود). دیپلوی از این به بعد فقط `SITE=https://basharaf.me ops/server/deploy.sh`. سرور در build داخلی `basharaf.me` را صدا می‌زند (cache DNS سرور ممکن است تا یک ساعت لیارا باشد — بی‌خطر).

## 📓 2026-11-01 — VPS: env روی سرور، اتصال به دیتابیس لیارا سبز، DNS زون جدید پارس‌پک — روی branch `ops/vps-deploy`
**چه شد:** دسترسی عمومی Postgres لیارا روشن است (`sahand.liara.cloud:31426`). متغیرها از «دانلود خروجی متغیرها»ی لیارا با اسکریپت (بدون نمایش مقدار) در `_work/basharaf-server.env` و `_work/basharaf-server.build.env` ادغام شدند: `DATABASE_URL` به آدرس عمومی، آدرس سایت `https://vps.basharaf.me`، `OUTBOX_SCHEDULER=off`؛ `PORT`/`NODE_ENV` عمداً منتقل نشد (systemd خودش 3001 می‌دهد و EnvironmentFile بر Environment= مقدم است). دو کلید جاافتاده‌ی قالب (`CUSTOMER_JWT_SECRET`، `NEXT_PUBLIC_NESHAN_API_KEY`) پیدا و به `env.template` اضافه شد. فایل‌ها با پشتیبان (`*.empty*.bak`) به `/etc/basharaf/` رفتند و فقط `basharaf.service` ری‌استارت شد. DNS: basharaf.me روی ns1-4.parspack.co بود ولی زون در حساب علی پیدا نشد؛ علی در CDN پارس‌پک زون جدید ساخت (`@` CNAME `sahand.liara.cloud`، `vps` A `94.184.45.140` بدون پروکسی، `_dmarc` TXT) و نیم‌سرورها را به `gorge.parspack.net` و `lightning.parspack.net` عوض کرد (W-015). هر دو سرور جدید جواب درست می‌دهند؛ رجیستری هنوز نیم‌سرورهای قدیمی را نشان می‌دهد.
**فایل‌ها:** `ops/server/env.template`، `HANDOFF.md`، `project-docs/handoff-archive.md`. بیرون از ریپو: `_work/basharaf-server.env`، `_work/basharaf-server.build.env` (secret، commit نمی‌شوند)؛ روی سرور `/etc/basharaf/{env,build.env}`.
**Build:** کد تغییر نکرد. روی سرور: سرویس active، `/login` ۲۰۰، `/apply` و `/reserve` ۲۰۰، `/api/recruitment/questions` و `/api/recruitment/form-structure` دیتای واقعی از دیتابیس (فقط خواندن)، بدون خطا در لاگ. meeez سالم (۳۰۷). سایت اصلی basharaf.me در تمام مدت ۲۰۰.
**ناتمام:** رسیدن نیم‌سرورها. نسخه‌ی فعلی سرور قبل از پر شدن `build.env` ساخته شده (NEXT_PUBLIC_* خالی) → deploy تازه لازم است. ⚠️ همه‌ی secretهای production (دیتابیس، JWT، ایمیل، پیامک، VAPID، notification) در اسکرین‌شات‌های چت دیده شدند → VPS-08. `~/Downloads/envs.txt` (همه‌ی secretها) باید توسط علی پاک شود.
**برای جلسه‌ی بعد:** `dig +short A vps.basharaf.me @1.1.1.1` → اگر `94.184.45.140`: `setup-server.sh site vps.basharaf.me` → `SITE=https://vps.basharaf.me ops/server/deploy.sh` → چک‌لیست. root SSH با `~/.ssh/meeez_parspack`. به meeez/nginx آن/Postgres آن دست نزن.

**ادامه (همان روز):** نیم‌سرورها به رجیستری رسید و `vps.basharaf.me` → `94.184.45.140`. با تأیید علی `setup-server.sh site vps.basharaf.me` اجرا شد: فایل جدای `/etc/nginx/sites-available/basharaf`، گواهی Let's Encrypt (تا 2027-01-30)، `nginx -t` سبز و reload؛ meeez سالم ماند. `SITE=https://vps.basharaf.me ops/server/deploy.sh`: tsc/lint/vitest محلی سبز، build روی سرور، release `20261101-151236-eb997b` زنده. تست بدون ورود: `/login`، `/apply`، `/reserve`، `/me`، `/clock`، `/pay` ۲۰۰؛ `/dashboard` → login؛ APIهای محافظت‌شده ۴۰۱؛ HTTP → HTTPS. نکته: `app/layout.tsx` (`metadataBase`) و `app/pay/PayCard.tsx` آدرس `https://basharaf.me` را hard-code دارند — بعد از سوئیچ درست است. خطاهای «Server Reference ID» در لاگ از رباط‌های اسکنر اینترنتی است، نه از برنامه.

**تست با ورود (2026-11-02، فقط خواندنی):** علی خودش در مرورگر داخلی وارد شد؛ Claude فقط صفحه‌ها را خواند (هیچ ثبت/ذخیره/حذفی نزد). `/dashboard` (۱۳ پرسنل فعال، ۱۰۱ تراکنش، موجودی حساب شرکا)، `/inventory`، `/hr/payroll` (دوره تیر محاسبه‌شده، اردیبهشت تأییدشده)، `/transactions` (۱۰۱ از ۱۰۱) درست بار شدند؛ خطای console صفر؛ لاگ سرور در همان بازه بدون خطا. تست‌های نوشتنی و نقش‌های دیگر چک‌لیست هنوز با علی است.

## 📓 2026-10-30 (۴) — انتقال به VPS پارس‌پک: زیرساخت آماده، تست داخلی سبز — روی branch `ops/vps-deploy`
**چه شد:** تصمیم علی: basharaf-app از لیارا به همان VPS meeez می‌رود؛ دیتابیس فعلاً روی Postgres لیارا می‌ماند. `ops/server/` اضافه شد (سرویس systemd روی ۳۰۰۱ با سخت‌گیری‌های meeez، قالب Nginx، `basharaf-release` با build روی سرور + سوئیچ اتمی + برگشت خودکار، `deploy.sh` از مک با `git archive`، `setup-server.sh`، `env.template` فقط نام متغیرها). `next.config.mjs`: خروجی standalone با `NEXT_OUTPUT=standalone` (build لیارا بی‌تغییر) و `serverExternalPackages` (کلید قدیمی در Next 15 خوانده نمی‌شد). `OUTBOX_SCHEDULER=off` تا در دوره‌ی موازی اعلان/پیامک دوبار نرود. روی سرور: swap ۲ گیگ، کاربر `basharaf`، پوشه‌ها، سرویس. build روی سرور چون `sharp` native است و مک arm64.
**فایل‌ها:** `ops/server/*`، `next.config.mjs`، `instrumentation-node.ts`.
**Build:** محلی tsc ✅ · ۷۶۲ تست ✅ · lint ۰ خطا · build لیارا ✅ · build standalone ✅. روی سرور: build+نصب+health check ✅ (release `20261030-024633-aae6a6`)، `/login` ۲۰۰، API ۴۰۱، رم سرویس ~۲۰۰MB؛ اوج build: رم ۱.۸ از ۲ گیگ + swap ۶۰۰MB، load ۳.۷ روی ۱ هسته → ارتقا به ≥۲ هسته/۴ گیگ توصیه شد. meeez در تمام مدت سالم.
**ناتمام:** `/etc/basharaf/env` و `build.env` خالی‌اند (سرویس فقط داخلی روی 127.0.0.1 است، بدون Nginx/دامنه). منتظر علی: تغییر رمز root، دسترسی عمومی دیتابیس لیارا، پرکردن `~/Claude-Projects/_work/basharaf-server.env`، رکورد A برای `vps.basharaf.me`.
**برای جلسه‌ی بعد:** بعد از ورودی‌های علی: آپلود env → `setup-server.sh site vps.basharaf.me` → `SITE=https://vps.basharaf.me ops/server/deploy.sh` → چک‌لیست → سوئیچ DNS با تأیید. branch `ops/vps-deploy` push نشده.

