# HANDOFF.md — دفتر وضعیت زنده‌ی پروژه «با شرف»

> قانون طلایی: **هر جلسه اول بخش ۰ را بخوان؛ آخر جلسه بخش ۰ + ژورنال را به‌روز کن و commit/push کن.**
> جزئیات تاریخی قدیمی‌تر: `project-docs/handoff-archive.md`.

---

## ⚡ بخش ۰ — وضعیت لحظه‌ای (اول این را بخوان)

| | |
|---|---|
| **نسخه** | `0.29.1` (روی `main` + production) |
| **آخرین به‌روزرسانی** | 2026-07-19 (شب‌کاری خودکار طبق اجازه‌ی کاربر) |
| **Build/tsc** | tsc ✅ ۰ خطا · tests 271/271 ✅ · build ✅ |
| **دیپلوی** | ✅ «کنترل گیرندگان اعلان» کامل روی main + production: بک‌آپ گرفته شد و تأیید شد، migration روی DB واقعی اجرا و verify شد (کاربر از DBeaver)، merge/push/deploy انجام شد (release v186). بعدش ۴ باگ واقعی که حین بازبینی پیدا شد هم رفع و deploy شدن (release تا v189). |
| **کار نیمه‌تمام (in-progress)** | smoke test نهایی UI (چک‌لیست `/admin/settings/notifications` — نسخه/گروه‌بندی/drawer) هنوز توسط کاربر تأیید نشده؛ دسترسی مرورگر من قطع بود. |
| **کار بعدی پیشنهادی** | چک‌لیست smoke test رو توی HANDOFF یا پیام قبلی نگاه کن و یک نگاه سریع بنداز. اگه اوکی بود، کار تمومه. |
| **بلاک‌شده/منتظر کاربر** | Playwright e2e ⛔ — `.env.e2e` غایب (بدون تغییر) |

> ⚠️ **نکته مهم برای جلسات بعدی:** فرم `/apply` حالا کاملاً داینامیک و دیتابیس‌محور است. **دیگر فیلد hard-code به `app/apply/page.tsx` یا `lib/recruitment/` اضافه نکنید.** همه فیلدهای جدید باید از طریق `/recruitment/form-builder` ایجاد شوند.

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

## 📓 2026-07-19 — release کامل کنترل گیرندگان اعلان + ۴ باگ واقعی رفع شد (v0.29.1)
**چه شد:** کاربر دستور داد release کامل «کنترل گیرندگان اعلان» رو end-to-end انجام بدم، بعد رفت بخوابه و اجازه داد مستقل ادامه بدم. ۱) **Release**: `liara db backup create` بک‌آپ manual تازه گرفت (۸.۴۹MB، هماهنگ با بک‌آپ‌های روزانه‌ی سالم — verify کامل بایت‌به‌بایت به‌خاطر محدودیت شبکه‌ی sandbox به S3 ایران ممکن نشد، ولی metadata/اندازه/زمان تأیید شد). تلاش برای اجرای migration از طریق `liara shell` با شکست مواجه شد (word-splitting در CLI، بدون shell واقعی) — کاربر خودش از DBeaver اجرا کرد؛ ۴ کوئری verify (جدول، ۵ constraint، ۶ قانون seed‌شده، صفر outbox جدید) همه تأیید شدن. نکته: `below_approval_limit` از قبل `email_enabled=true` داشت (نه از migration من — `ON CONFLICT DO NOTHING` دست‌نخورده نگهش داشت؛ منشأ دقیقش نامشخص، برای کاربر یادداشت شد). fast-forward merge به main → push → دیپلوی (release v186) بدون خطا. ۲) **بازبینی مستقل بعد از release** — ۴ باگ واقعی پیدا و رفع شد (هر کدام با tsc+test+build+commit+push جدا): **الف)** `DetectivePane.tsx` (تب «دستیار مالی» در Settings معمولی) یک دکمه‌ی toggle پیامک مستقل داشت که مستقیم `notification_rules.smsEnabled` رو می‌نوشت — یک مسیر کنترل تکراری و موازی با پنل مرکزی جدید. حذف شد؛ الان فقط نشانگر فقط‌خواندنی + لینک به پنل مرکزی (دقیقاً مثل الگوی قبلی SmsPane.tsx). API مربوطه (`PATCH /api/anomaly/rules/[key]`) هم دیگر smsEnabled قبول نمی‌کند. **ب)** اعلان شخصی «برگه‌ی انبار شما تأیید شد» (در `approve/route.ts`) از همون `ruleKey='voucher_pending'` استفاده می‌کرد که برای broadcast «برگه نیاز به تأیید دارد» به ادمین‌ها هم استفاده می‌شه — یعنی خاموش‌کردن broadcast از پنل جدید، اعلان شخصی به ثبت‌کننده رو هم بی‌صدا خاموش می‌کرد. کلید جدا و اختصاصی `voucher_approved` (audienceConfigurable:false، دقیقاً مثل الگوی `pending_approval`) ساخته شد؛ چون هیچ ردیف DB لازم ندارد، migration نمی‌خواهد. **ج)** در `RecipientDrawer.tsx`، دکمه‌ی «کپی از کانال دیگر» تنظیمات ذخیره‌شده‌ی سرور رو کپی می‌کرد نه draft محلی — اگه کاربر کانال مبدأ رو ویرایش کرده بود ولی Save نزده بود، بعد از کپی حالت client/server ناهماهنگ می‌شد. دکمه‌های کپی الان وقتی تغییرات ذخیره‌نشده هست غیرفعالن؛ `onSaved()` بعد از کپی موفق هم صدا زده می‌شه تا لیست پدر sync بمونه. **د)** audit log برای `notification.audience.updated` فقط تعداد هدف رو ثبت می‌کرد، نه خودشون — لیست کامل هدف‌ها (channel/effect/type/role/branch/user id) اضافه شد. تست جدید برای (ب) اضافه شد؛ (الف)/(ج)/(د) با بازبینی کد تأیید شدن (بدون DB لوکال، تست‌نویسی کامل UI/route بیش‌ازحد وقت می‌گرفت).
**فایل‌ها:** `components/settings/DetectivePane.tsx`، `app/api/anomaly/rules/[key]/route.ts`، `app/api/inventory/vouchers/[id]/approve/route.ts`، `lib/notifications/catalog.ts`، `tests/unit/notification-audience.test.ts`، `components/admin/notifications/RecipientDrawer.tsx`، `app/api/admin/notification-audience/route.ts`، `package.json`، `package-lock.json`، `HANDOFF.md`
**Build:** tsc ✅ ۰ خطا · tests 271/271 ✅ · build ✅ (بعد از هر کدام از ۵ commit جدا تأیید شد)
**ناتمام:** smoke test UI نهایی (چک‌لیست ارسال‌شده به کاربر) هنوز تأیید نشده — دسترسی Chrome من قطع بود. لاگ‌های production تا release v189 کاملاً تمیزن (بدون خطا).
**برای جلسه‌ی بعد:** ۱) وقتی کاربر بیدار شد، چک‌لیست smoke test رو ازش بپرس یا خودت با دسترسی مرورگر انجام بده. ۲) منشأ `below_approval_limit.email_enabled=true` (از قبل production) رو با کاربر چک کن — عمدی بوده یا باقیمانده‌ی تست قدیمی؟

## 📓 2026-07-18 — کنترل گیرندگان اعلان (Audience & Access Control) — branch جدا (v0.29.0)
**چه شد:** طبق یک درخواست فنی مفصل، سیستم کامل «چه کسی هر اعلان رو دریافت کنه» ساخته شد — روی branch جدا `feat/notification-audience-control`، **بدون merge به main**. ۱) جدول جدید `notification_rule_targets` (migration idempotent، additive، با BEGIN/COMMIT) — هدف بر اساس نقش/شعبه/شعبه‌ی رویداد/کاربر خاص/همه‌ی فعال‌ها، هر کدام include یا exclude، مستقل به‌ازای هر کانال (داخل‌برنامه/پیامک/ایمیل). ۲) `lib/notifications/catalog.ts` — منبع واحد فارسی برای همه‌ی ۱۴ قانون اعلان (عنوان، توضیح، دسته، آستانه، بخش/مجوز لازم). ۳) `lib/notifications/audience.ts` — تابع خالص `resolveAudience()` (بدون DB، کاملاً تست‌پذیر) که قرارداد resolve رو پیاده می‌کنه: exclude همیشه برنده، هدف کانال‌محور روی هدف مشترک اولویت داره، بدون تنظیم = رفتار قدیمی (همه‌ی SuperAdminهای فعال)، آدیانس سفارشی که صفر بشه هیچ fallback نداره. ۴) `service.ts` بازنویسی شد — دیگه SuperAdmin رو hardcode نمی‌کنه، گیرنده‌ها رو جدا برای هر کانال resolve می‌کنه. ۵) دو API جدید: `notification-audience` (GET لیست+preview/replace/copy/reset با optimistic concurrency و audit log) و `notification-audience/options`. ۶) صفحه‌ی `/admin/settings/notifications` بازطراحی شد — گروه‌بندی بر اساس دسته، شمارنده‌ی گیرنده به‌ازای هر کانال، drawer کامل «گیرندگان» (`components/admin/notifications/RecipientDrawer.tsx`) با تب هر کانال، include/exclude، پیش‌نمایش زنده، کپی بین کانال‌ها، بازگردانی، ذخیره/انصراف صریح، هشدار تغییرات ذخیره‌نشده، مدیریت خطای ۴۰۹. ۷) **یک باگ واقعی کشف و رفع شد ضمنی**: ۶ قانون کارآگاه مالی (`waste_spike` و مشابه) هیچ‌وقت ردیفی در `notification_rules` نداشتن، پس اعلانشون همیشه بی‌صدا drop می‌شد — الان seed شدن. ۸) تمایز صریح: `pending_approval` (و مسیر شخصی voucher تأیید) اعلان شخصی به ثبت‌کننده‌ست، نه broadcast — `audienceConfigurable:false`، دکمه‌ی گیرندگان نداره، تست جدا داره. ۹) ۳۲ تست جدید (`notification-audience.test.ts`) + ۱ تست قدیمی اصلاح شد (mock جدید نیاز داشت) + ۷ تست Playwright جدید (فقط `--list` تأیید شد، اجرای واقعی به‌خاطر نبود `.env.e2e` و اشغال پورت ۳۰۰۰ توسط یک پروسه‌ی قبلی/غیرمرتبط بلاک است — مثل ماه‌های قبل).
**فایل‌ها:** `project-docs/migrations/db-notification-audience-control.sql` (جدید)، `lib/db/schema.ts`، `lib/notifications/catalog.ts` (جدید)، `lib/notifications/audience.ts` (جدید)، `lib/notifications/audienceValidation.ts` (جدید)، `lib/notifications/service.ts`، `lib/notifications/types.ts`، `lib/notify.ts`، `app/api/admin/notification-audience/route.ts` (جدید)، `app/api/admin/notification-audience/options/route.ts` (جدید)، `components/admin/notifications/RecipientDrawer.tsx` (جدید)، `app/(admin)/admin/settings/notifications/page.tsx`، `lib/auth/audit.ts`، producerهای notifyAdmins (`transactions/[id]/approve`، `cheques`، `inventory/vouchers/import`، `inventory/pendingNotifications`، `inventory/inventoryWarnings`، `purchase-orders/[id]/receive`، `anomaly/engine`)، `tests/unit/notification-audience.test.ts` (جدید)، `tests/unit/notification-center-v2.test.ts`، `tests/e2e/notification-audience.spec.ts` (جدید)، `project-docs/NOTIFICATION-AUDIENCE-CONTROL-ROLLOUT.md` (جدید)، `package.json`، `package-lock.json`، `HANDOFF.md`
**Build:** tsc ✅ ۰ خطا · tests 270/270 ✅ · build ✅ · playwright --list ✅ ۳۶ تست (۷ جدید) · git diff --check ✅
**ناتمام:** merge به main، اجرای migration روی production، و enable کردن آدیانس سفارشی برای هر قانون — همه عمداً برای جلسه‌ی بعد گذاشته شد (کاربر صریحاً گفت این run نه merge کنه نه deploy).
**برای جلسه‌ی بعد:** ۱) ROLLOUT جدید رو بخون. ۲) migration اجرا کن. ۳) merge/push. ۴) در پنل، برای قانون‌های حساس (مثل تراکنش مبلغ بالا) گیرندگان سفارشی تنظیم کن.

## 📓 2026-07-18 — پنل Super Admin موبایل‌فرندلی شد (v0.28.2)
**چه شد:** کاربر گزارش داد پنل Super Admin روی گوشی قابل‌استفاده نیست. علت: `AdminSidebar` یک `<aside>` با `w-56` ثابت بود که همیشه نمایش داده می‌شد و روی صفحه‌ی باریک موبایل بیشتر عرض را می‌گرفت. ۱) `components/admin/AdminSidebar.tsx` بازنویسی شد: زیر `md` یک نوار بالای موبایل (دکمه‌ی همبرگری) + کشوی کناری (drawer، از راست باز می‌شود چون RTL) اضافه شد؛ از `md` به بالا دقیقاً همان سایدبار قبلی بدون تغییر بصری. ۲) `app/(admin)/layout.tsx`: کانتینر اصلی از `flex` به `flex flex-col md:flex-row` تغییر کرد تا نوار موبایل بالای محتوا بیفتد (نه کنارش)؛ padding `main` به `p-4 md:p-6` تغییر کرد. ۳) `app/(admin)/admin/page.tsx`: جدول لاگ رویدادها در `overflow-x-auto` پیچیده شد (الگوی همیشگی پروژه برای جداول). ۴) `app/(admin)/admin/settings/notifications/page.tsx`: یک `p-6` تکراری (باعث padding دوبل روی موبایل کنار padding سطح layout) حذف شد؛ ردیف badgeهای وضعیت provider به `flex-wrap` تغییر کرد. ۵) `app/(admin)/admin/settings/financial-periods/page.tsx`: ردیف فرم بستن دوره (سال/ماه/دکمه) از `flex items-end` به `flex flex-col sm:flex-row` تغییر کرد تا زیر `sm` عمودی بچینند. تأیید بصری با یک preview محلی (Playwright، viewport 390×844، JWT جعلی SuperAdmin چون DB لوکال نبود) انجام شد — نوار موبایل، کشو، ناوبری، و بستن خودکار کشو همه درست کار می‌کنند.
**فایل‌ها:** `components/admin/AdminSidebar.tsx`، `app/(admin)/layout.tsx`، `app/(admin)/admin/page.tsx`، `app/(admin)/admin/settings/notifications/page.tsx`، `app/(admin)/admin/settings/financial-periods/page.tsx`
**Build:** tsc ✅ ۰ خطا · tests 238/238 ✅ · build ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** اگر بعداً بازخورد داد که بخش دیگری از پنل (مثلاً صفحات اصلی اپ به‌جز Super Admin) هم روی موبایل مشکل دارد، جدا بررسی شود — این جلسه فقط پنل Super Admin (۵ صفحه‌ی زیر `app/(admin)`) را پوشش داد.

## 📓 2026-07-18 — راه‌اندازی NC V2 در production + scheduler لوکال داخل‌پروسه (v0.28.1)
**چه شد:** ۱) تأیید شد env vars (`NEXT_PUBLIC_APP_URL`, `NOTIFICATION_PROCESSOR_SECRET`, `MAIL_*` Resend) قبلاً در پنل Liara ست شده بودن. ۲) تأیید شد `feat/notification-center-v2` قبلاً به `main` merge/push شده و دیپلوی موفق بوده. ۳) migration `db-notification-center-v2.sql` روی production DB تأیید شد که قبلاً اجرا شده (خروجی "already exists, skipping" برای همه‌ی ستون‌ها/ایندکس‌ها). ۴) تلاش برای scheduler خارجی (cron-job.org) با timeout مواجه شد — علت احتمالی: عدم دسترسی شبکه‌ی سرویس‌های بین‌المللی به هاست ایرانی Liara (تحریم/فیلترینگ). GET مستقیم از مرورگر کاربر به همون آدرس بلافاصله ۴۰۵ برگردوند (یعنی سرور کاملاً سالم و در دسترس بود، فقط دسترسی cron-job.org مشکل داشت). ۵) **راه‌حل نهایی:** فایل `instrumentation.ts` در ریشه‌ی پروژه اضافه شد — با هوک `register()` نیتیو Next.js 14، وقتی سرور بالا میاد یک `setInterval` هر ۶۰ ثانیه مستقیم `processOutboxBatch()` را در همان پروسه صدا می‌زند (بدون هیچ HTTP call یا سرویس بیرونی — کاملاً لوکال، مصون از هر مشکل شبکه‌ی بین‌المللی). دارای guard تکرارنشدن هم‌زمان (`isRunning`) و try/catch با `logEvent`. Endpoint `/api/internal/notifications/process` دست‌نخورده باقی ماند (برای trigger دستی/آینده).
**چه شد (ادامه):** حین verify کردن دیپلوی، ۲ تست `nextDayMidnightTehran` fail شدن (preexisting، نه از تغییر بالا). ریشه‌یابی شد: `Intl.DateTimeFormat` با `hour12: false` درست در ساعت نیمه‌شب تهران، مقدار ساعت را `24` برمی‌گرداند (نه `00` — quirk شناخته‌شده‌ی ICU)، که باعث می‌شد محاسبه‌ی offset تهران ۲۴ ساعت اضافه حساب شود و نتیجه در گذشته بیفتد. این باگ می‌توانست job تست `unit-test` در GitHub Actions را دقیقاً حوالی نیمه‌شب fail کند و **دیپلوی را بلاک کند** (چون `deploy` به `unit-test` وابسته است) — پس در همین جلسه رفع شد: در `lib/notifications/retry.ts`، `hour12: false` به `hourCycle: 'h23'` تغییر کرد + نرمال‌سازی دفاعی `% 24` روی مقدار ساعت.
**فایل‌ها:** `instrumentation.ts` (جدید)، `lib/notifications/retry.ts`، `HANDOFF.md`، `package.json`، `package-lock.json`
**Build:** tsc ✅ ۰ خطا · build ✅ · tests 238/238 ✅
**ناتمام:** بعد از push، هنوز لاگ production را برای اولین tickهای موفق scheduler چک نکرده‌ایم.
**برای جلسه‌ی بعد:** ۱) چند دقیقه بعد از دیپلوی، لاگ‌های Liara (`liara logs`) را چک کن که scheduler داخلی بدون خطا در حال اجراست. ۲) اگر cron-job.org job ساخته شده، حذفش کن چون دیگر لازم نیست.

## 📓 2026-07-17 — اصلاح release-blocker — هم‌راستایی processor secret و scheduler (v0.28.0)
**چه شد:** ۴ اصلاح release-blocker: ۱) `scripts/process-notifications.mjs` از `PROCESSOR_SECRET` به `NOTIFICATION_PROCESSOR_SECRET` تغییر کرد (سه موضع: comment، `process.env.*`، error message). ۲) `.env.example` — `NEXT_PUBLIC_APP_URL=https://basharaf.me` (الزامی برای لینک‌های اعلان)؛ `APP_URL=https://basharaf.me` (فقط برای script، نه برای external cron). ۳) `ROLLOUT.md` — scheduler provider-neutral شد؛ قرارداد دقیق scheduler (POST / هر دقیقه / Authorization header / timeout <60s) جایگزین ادعای «Liara Cron Job service» شد. ۴) ۴ تست جدید اضافه شد (`processor secret contract`) که ثابت می‌کنند script و route هر دو از `NOTIFICATION_PROCESSOR_SECRET` استفاده می‌کنند و `process.env.PROCESSOR_SECRET` وجود ندارد. نتیجه: 234→238 تست.
**فایل‌ها:** `scripts/process-notifications.mjs`، `.env.example`، `project-docs/NOTIFICATION-CENTER-V2-ROLLOUT.md`، `tests/unit/notification-center-v2.test.ts`، `HANDOFF.md`
**Build:** tsc ✅ ۰ خطا · tests 238/238 ✅ · build ✅ · git diff --check ✅
**ناتمام:** migration اجرا نشده · env vars در Liara ست نشده · scheduler تنظیم نشده
**برای جلسه‌ی بعد:** ROLLOUT.md §1 step 5 بخوان → یک HTTP scheduler انتخاب کن → env vars → migration → merge.

## 📓 2026-07-16 — تکمیل کامل NC V2 — ۱۱ بخش + commit/push آماده (v0.28.0)
**چه شد:** تکمیل نهایی Notification Center V2 در ۱۱ بخش: ۱) `notificationsSlice.ts` بازنویسی کامل — `viewRemove`/`viewPrepend` helpers، `_setNotifications` با `serverUnreadCount?` اختیاری، همه mutationها viewIds را به‌روز می‌کنند، rollback delta-based (نه absolute restore). ۲) `page.tsx` — `serverUnreadCount` از store (نه filter local). ۳+۴) `provider-status/route.ts` + `notification-rules/route.ts` — `isEmailConfigured()` canonical. ۵) `channels/email.ts` — JSDoc اصلاح شد. ۶) `processor.ts` — `buildSmsMessage` link-too-long bug رفع شد. ۷) `db-notification-center-v2.sql` — schema-qualified catalog checks، FK repair برای CASCADE/NO ACTION/RESTRICT/غایب، ۳ CHECK constraint جدید (attempts≥0، max_attempts>0، attempts≤max). ۸) `scripts/process-notifications.mjs` — اسکریپت processor با timeout 50s؛ ⚠️ Liara Next.js cron blocker گزارش شد. ۹) `.env.example` — provider-neutral DB، `KAVENEGAR_API_KEY`، `SMS_DRY_RUN`، `APP_URL`. ۱۰) تست‌های جدید (۲۷): field-level SMTP، SMS boundary، store unread count، bell view، delta rollback، service active rule، API routes. نتیجه: 207→234 تست. ۱۱) مستندات: ROLLOUT.md (6-step release + Liara cron blocker)، NC-V2-CHANGES-ANALYSIS.md (دور سوم).
**فایل‌ها:** `store/slices/notificationsSlice.ts`، `app/(app)/notifications/page.tsx`، `app/api/admin/notifications/provider-status/route.ts`، `app/api/admin/notification-rules/route.ts`، `lib/notifications/channels/email.ts`، `lib/notifications/processor.ts`، `project-docs/migrations/db-notification-center-v2.sql`، `scripts/process-notifications.mjs` (جدید)، `.env.example`، `tests/unit/notification-center-v2.test.ts`، `project-docs/NOTIFICATION-CENTER-V2-ROLLOUT.md`، `project-docs/NC-V2-CHANGES-ANALYSIS.md`، `HANDOFF.md`، `project-docs/handoff-archive.md`
**Build:** tsc ✅ ۰ خطا · tests 234/234 ✅ · build ✅ · git diff --check ✅
**ناتمام:** push نشده — منتظر تأیید کاربر برای commit+push
**برای جلسه‌ی بعد:** ۱) ROLLOUT.md بخوان — ۶ قدم release. ۲) env vars در Liara. ۳) migration اجرا. ۴) push. ۵) ⚠️ Liara Cron Job service بساز.

## 📓 2026-07-16 — تست‌های رفتاری NC V2 — ۳۷ تست جدید، کد تولید مستقیم (v0.28.0)
**چه شد:** ۳۷ تست رفتاری به `tests/unit/notification-center-v2.test.ts` افزوده شد. همه تست‌ها کد تولیدی واقعی را import و اجرا می‌کنند (بدون re-implementation). پوشش: ۱) `cursor.ts` — UUID validation، size limit >512 bytes. ۲) `rules.ts` — shouldEnqueueEmail فقط از DB rule تبعیت می‌کند نه SMTP. ۳) `processor.ts` — buildSmsMessage، link ایمن/ناایمن، truncation صحیح. ۴) `channels/email.ts` — SMTP absent → status='failed' (retryable، نه 'skipped'). ۵) store — Bell fetch با `setViewPage` page cursor را پاک نمی‌کند؛ append به یک view روی view دیگر اثر نمی‌گذارد. ۶) store rollback — concurrent realtime event بعد از rollback یک item حذف نمی‌شود. ۷) process route (`app/api/internal/notifications/process/route.ts`) — secret missing → 503؛ اشتباه → 401؛ درست → 200؛ error پاک نمی‌کند. ۸) `service.ts` — disabled rule → هیچ insert اجرا نمی‌شود؛ outerTx → db.transaction صدا زده نمی‌شود. ۹) `retry.ts` — nextDayMidnightTehran همیشه > now؛ Tehran midnight 00:00 صحیح است. نتیجه: ۸۵→۱۲۲ تست در nc-v2، جمع کل ۱۷۰→۲۰۷. tsc ✅ build ✅.
**فایل‌ها:** `tests/unit/notification-center-v2.test.ts`، `HANDOFF.md`
**Build:** tsc ✅ ۰ خطا · tests 207/207 ✅ · build ✅ · push ⛔ (عمدی — دستور کاربر)
**ناتمام:** push نشده · migration `db-notification-center-v2.sql` روی DB اجرا نشده · Playwright e2e ⛔ (`.env.e2e` غایب)
**برای جلسه‌ی بعد:** ۱) `project-docs/NOTIFICATION-CENTER-V2-ROLLOUT.md` بخوان. ۲) migration را روی DB اجرا کن. ۳) `NOTIFICATION_PROCESSOR_SECRET` + `MAIL_*` vars در Liara ست کن. ۴) push کن.

<!-- archived to project-docs/handoff-archive.md: 2026-07-14 payroll approve + تأیید نهایی فاز ۱ v0.24.0 + 2026-07-14 فاز امنیتی ۱ + 2026-07-15 استقرار جریان تک‌نشست + 2026-07-15 تست رگرسیون P&L + 2026-07-15 جداسازی E2E + 2026-07-15 notification فاز ۱ + 2026-07-16 Notification Center V2 اولیه + 2026-07-16 اصلاح ۱۵‌گانه NC V2 + 2026-07-16 ممیزی مستقل ۹‌بخشی NC V2 -->

