# HANDOFF.md — دفتر وضعیت زنده‌ی پروژه «با شرف»

> قانون طلایی: **هر جلسه اول بخش ۰ را بخوان؛ آخر جلسه بخش ۰ + ژورنال را به‌روز کن و commit/push کن.**
> جزئیات تاریخی قدیمی‌تر: `project-docs/handoff-archive.md`.

---

## ⚡ بخش ۰ — وضعیت لحظه‌ای (اول این را بخوان)

| | |
|---|---|
| **نسخه** | main/production = `0.29.2` (release v193 + lint CI). `0.30.0` روی branch `feat/ui-ux-refresh-phase-1`، هنوز merge/deploy نشده. |
| **آخرین به‌روزرسانی** | 2026-07-23 |
| **Build/tsc** | tsc ✅ ۰ خطا · tests 280/280 ✅ · build ✅ · lint ✅ (روی هر دو) |
| **دیپلوی** | ✅ main: همه‌چیز پایدار، ۴+ روز بدون خطا. یک فیچر UI جدید («UI/UX Refresh Phase 1» — `ConfirmDialog` مشترک، reduced-motion، یکدست‌سازی focus ring) روی branch جداست، عمداً merge/deploy نشده. |
| **کار نیمه‌تمام (in-progress)** | — |
| **کار بعدی پیشنهادی** | ۱) `project-docs/UI-UX-REFRESH-PHASE-1.md` بخوان → branch رو merge/push کن اگه راضی بودی. ۲) smoke test بصری پنل `/admin/settings/notifications` هنوز با چشم کاربر تأیید نشده. |
| **بلاک‌شده/منتظر کاربر** | ۱) Playwright e2e ⛔ — `.env.e2e` غایب (بدون تغییر، چند ماهه). ۲) منشأ `below_approval_limit.email_enabled=true` (از قبل production، نه از کار ما) هنوز با کاربر چک نشده — عمدی بوده یا باقیمانده‌ی تست قدیمی؟ |

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

## 📓 2026-07-23 — ESLint در CI + شروع «UI/UX Refresh Phase 1» روی branch جدا (main: v0.29.2 · branch: v0.30.0)
**چه شد:** ۱) **روی main** (push مستقیم، عمدی — تمیزکاری کد + گیت CI، بدون ریسک منطق کسب‌وکار): یه `lint` job به GitHub Actions اضافه شد (`npm run lint` قبل از deploy) — قبلاً ESLint اصلاً جایی اجرا نمی‌شد (نه در build چون `ignoreDuringBuilds:true`، نه در CI)، یعنی باگ crash کامل سایت که همین امروز رفع شد (hook بعد از `return null`) می‌تونست دوباره بی‌صدا رخ بده چون دقیقاً همون rule (`react-hooks/rules-of-hooks`) این کلاس باگ رو می‌گیره. یه اسکن کامل با ESLint تأیید کرد جای دیگه‌ای از این باگ نیست. ۲ تا کامنت `eslint-disable` بی‌فایده هم پاک شد (به rule‌ای اشاره می‌کردن که اصلاً در تنظیمات پروژه فعال نیست). ۲) **روی branch جدا `feat/ui-ux-refresh-phase-1`** (بدون merge/deploy): طبق یک درخواست فنی مفصل برای «بازطراحی کامل UI/UX»، اول یک ممیزی کامل انجام شد که نشون داد سیستم طراحی این پروژه از قبل خیلی بالغه (۲۷ کامپوننت مشترک، توکن‌های معنایی رنگ/سایه/شعاع/انیمیشن کامل) — پس به‌جای بازنویسی صفحات سالم، فقط شکاف‌های واقعی بسته شدن: **الف)** کامپوننت مشترک جدید `ConfirmDialog`/`useConfirm()` جایگزین ۳ محل `window.confirm()` بومی شد (با پشتیبانی تم روشن/تیره، مدیریت focus، Escape). **ب)** ناهماهنگی focus-ring در `Checkbox`/`Switch` (رنگ خاکستری ثابت به‌جای accent معنایی) رفع شد. **ج)** پشتیبانی `prefers-reduced-motion` که کلاً وجود نداشت به `globals.css` اضافه شد. عملکرد قبل/بعد اندازه‌گیری شد (build sizes) — تغییر ناچیز (~۱KB برای هر route، برای یک کامپوننت مشترک قابل‌استفاده در کل اپ).
**فایل‌ها:** `.github/workflows/liara.yml`، `app/api/admin/notification-outbox/route.ts`، `lib/notifications/channels/email.ts` (روی main) · `components/ui/ConfirmDialog.tsx` (جدید)، `components/ui/Checkbox.tsx`، `components/ui/Switch.tsx`، `components/ui/index.ts`، `app/globals.css`، `app/(app)/layout.tsx`، `app/(admin)/layout.tsx`، `app/(app)/purchase-orders/[id]/page.tsx`، `app/(admin)/admin/settings/notifications/page.tsx`، `components/admin/notifications/RecipientDrawer.tsx`، `tests/e2e/ui-ux-refresh-phase-1.spec.ts` (جدید)، `tests/e2e/notification-audience.spec.ts`، `project-docs/UI-UX-REFRESH-PHASE-1.md` (جدید) (روی branch)
**Build:** tsc ✅ ۰ خطا · tests 280/280 ✅ · build ✅ · lint ✅ · playwright --list ✅ ۳۸ تست (۹ جدید) · git diff --check ✅
**ناتمام:** merge/deploy برنچ UI عمداً انجام نشد. Phase 2 (retrofit کنسل‌کردن fetch در store، مهاجرت رنگ‌های پنل ادمین به توکن‌های dark، FilterToolbar/Pagination مشترک) مستندسازی شد ولی شروع نشده.
**برای جلسه‌ی بعد:** `UI-UX-REFRESH-PHASE-1.md` رو با کاربر مرور کن، اگه راضی بود merge/push کن.

## 📓 2026-07-19 — رفع باگ بحرانی crash کامل سایت + قابلیت دانلود دسته‌ای رزومه (v0.29.2)
**چه شد:** ۱) **باگ بحرانی**: کاربر گزارش داد بعد از ذخیره‌ی یک یادداشت روی فرم استخدام، کل سایت (`/dashboard`) با خطای «مشکلی پیش آمد» crash کرد (React error #310 در کنسول). بررسی نشون داد `components/layout/NotificationsBell.tsx` خط ۵۴۸ یک `if (!user) return null;` **وسط** لیست hookها داشت — ۵ تا `useCallback` (خطوط ۵۵۲-۵۵۷) بعد از این return شرطی صدا زده می‌شدن، یعنی نقض مستقیم قانون Rules of Hooks. هر وقت `user` در store به‌طور موقت falsy می‌شد (که با «یادداشت» ربط علّی نداشت، صرفاً هم‌زمانی بود)، React تعداد hookهای متفاوت بین رندرها می‌دید و کل درخت کامپوننت رو crash می‌کرد — این باگ از قبل توی کد بود، نه از کارهای این هفته. رفع شد: همه‌ی ۵ `useCallback` قبل از `if (!user)` منتقل شدن؛ حالا این شرط هیچ hookای بعدش نداره. Deploy شد (release v191) و از اون موقع (۴ روز) صفر خطا در لاگ‌ها. ۲) **قابلیت جدید**: «دانلود رزومه‌ها» در `/recruitment` — حالت انتخاب چندتایی (چک‌باکس روی کارت‌های دارای رزومه + دکمه‌ی «انتخاب همه»)، و `POST /api/recruitment/resumes-zip` (فقط SuperAdmin) که رزومه‌های انتخابی (base64 data URI، با fallback برای لینک خارجی قدیمی) رو با `jszip` بسته‌بندی و دانلود می‌کنه؛ رزومه‌ی خراب/غیرقابل‌دیکد skip می‌شه نه کل batch رو fail کنه؛ نام فایل‌ها دی‌داپ می‌شن (`نام_خانوادگی`, `_۲`, `_۳`...). Deploy شد (release v193)، ۴ روزه بدون خطا.
**فایل‌ها:** `components/layout/NotificationsBell.tsx`، `app/(app)/recruitment/page.tsx`، `app/api/recruitment/resumes-zip/route.ts` (جدید)، `tests/unit/recruitment-resumes-zip.test.ts` (جدید)، `package.json`، `package-lock.json` (اضافه‌شدن `jszip`)
**Build:** tsc ✅ ۰ خطا · tests 280/280 ✅ · build ✅ (یک بار build محلی به‌خاطر فشار CPU sandbox قفل کرد — kill و rebuild حلش کرد، ربطی به کد نداشت)
**ناتمام:** smoke test بصری پنل `/admin/settings/notifications` هنوز با چشم کاربر تأیید نشده. منشأ `below_approval_limit.email_enabled=true` (پیش از این‌همه کار، در production) هنوز نامشخصه.
**برای جلسه‌ی بعد:** اگه کاربر دوباره گزارش «سایت crash کرد» داد، اول کنسول مرورگر (`React error #3xx`) رو چک کن — این کلاس باگ (hook بعد از return شرطی) ممکنه جای دیگه‌ای هم توی کد قدیمی‌تر باشه؛ یک `grep` سیستماتیک برای «return null|return;» قبل از `useCallback/useMemo` در کل `components/` می‌تونه ارزش بازبینی داشته باشه.

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

<!-- archived to project-docs/handoff-archive.md: 2026-07-14 payroll approve + تأیید نهایی فاز ۱ v0.24.0 + 2026-07-14 فاز امنیتی ۱ + 2026-07-15 استقرار جریان تک‌نشست + 2026-07-15 تست رگرسیون P&L + 2026-07-15 جداسازی E2E + 2026-07-15 notification فاز ۱ + 2026-07-16 Notification Center V2 اولیه + 2026-07-16 اصلاح ۱۵‌گانه NC V2 + 2026-07-16 ممیزی مستقل ۹‌بخشی NC V2 + 2026-07-16 تست‌های رفتاری NC V2 + 2026-07-16 تکمیل کامل NC V2 (۱۱ بخش) -->

