# HANDOFF.md — دفتر وضعیت زنده‌ی پروژه «با شرف»

> قانون طلایی: **هر جلسه اول بخش ۰ را بخوان؛ آخر جلسه بخش ۰ + ژورنال را به‌روز کن و commit/push کن.**
> جزئیات تاریخی قدیمی‌تر: `project-docs/handoff-archive.md`.

---

## ⚡ بخش ۰ — وضعیت لحظه‌ای (اول این را بخوان)

| | |
|---|---|
| **نسخه** | **production روی VPS پارس‌پک** = release `20261102-140407-72fcbe` (main = `4c1be51`+). اپ لیارا **Stop** شد (2026-11-02)؛ فقط دیتابیس لیارا مانده. `feat/tx-idempotency` push نشده. |
| **آخرین به‌روزرسانی** | 2026-11-02 (مسیر کاری: `~/Claude-Projects/01-Active/basharaf-app` + worktree `~/Claude-Projects/_work/basharaf-next15`) |
| **Build/tsc** | روی `chore/next-15-upgrade`: tsc ✅ · unit 762/762 ✅ · lint ۰ خطا · build ✅ · build شبیه لیارا ✅ |
| **دیپلوی** | **`https://basharaf.me` روی VPS** (`94.184.45.140`؛ HTTPS تا 2027-01-31؛ `www` → 301؛ `vps.basharaf.me` هم سرو می‌شود). دیپلوی: `SITE=https://basharaf.me ops/server/deploy.sh` (push به main فقط CI تست، بدون لیارا). دیتابیس هنوز Postgres لیارا (آدرس عمومی). **outbox scheduler روشن روی VPS.** |
| **کار نیمه‌تمام (in-progress)** | ۱) استودیو رسپی (WIP commit‌نشده؛ ۱۰ صفحه placeholder، migrationها اجرا نشده، bootstrap بدون auth). |
| **کار بعدی پیشنهادی** | ۰) ریز کارکرد مهر برای پنل پرسنل (با تأیید علی)، رفع نفر تکراری، ثبت دستمزد؛ اصلاح دائمی rewrite منو در middleware. ۱) VPS-09 انتقال دیتابیس به VPS (سرور ارتقا یافت؛ cluster جدا، نه Postgres مشترک meeez؛ اتصال خواندنی به production با تأیید علی). ۲) VPS-08 چرخش secretها. ۳) مرتب کردن DNS: رکورد `@` فعلاً CNAME → `vps.basharaf.me`. ۴) بعد از چند روز پایداری: حذف اپ لیارا (فقط با تأیید علی). |
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

## 📓 2026-11-02 — سوئیچ basharaf.me به VPS پارس‌پک (برنامه؛ دیتابیس هنوز لیارا) — روی branch `ops/vps-deploy`
**چه شد:** تست با ورود مدیر روی vps (فقط خواندنی) سبز. علی تصمیم گرفت دو مرحله‌ای: اول برنامه، بعد دیتابیس (بعد از ارتقای سرور). Claude با ورود خود علی در مرورگر داخلی، در CDN پارس‌پک: TTL رکورد `@` → ۱ دقیقه، رکورد جدید `A www → 94.184.45.140` (۲ دقیقه، بدون پروکسی)، و بعد (به درخواست علی «همین الان») رکورد `@` (CNAME؛ نوعش در پنل قابل تغییر نیست) از `sahand.liara.cloud` به `vps.basharaf.me`. روی سرور `switch-main.sh` (فقط فایل nginx با‌شرف؛ پشتیبان `/root/basharaf-nginx.before-switch.*`): بلوک‌های basharaf.me/www اضافه شد بی‌آنکه vps قطع شود، گواهی Let's Encrypt `basharaf.me` + `www` (تا 2027-01-31). `APP_URL`/`NEXT_PUBLIC_APP_URL` → `https://basharaf.me` (پشتیبان `*.before-main-switch.bak`) و release `20261102-140407-72fcbe` ساخته و زنده شد. job `deploy` لیارا در CI با `if: false` غیرفعال شد (`1a9a270`).
**فایل‌ها:** `.github/workflows/liara.yml`، `HANDOFF.md`، `project-docs/handoff-archive.md` · سرور: `/etc/nginx/sites-available/basharaf`، `/etc/basharaf/{env,build.env}`، `/root/basharaf-ops/switch-main.sh` · Mac: `~/Claude-Projects/_work/basharaf-server{,.build}.env`.
**Build:** deploy.sh سبز (tsc/lint/vitest محلی + build سرور). `https://basharaf.me` و `/login /apply /reserve /me /clock /pay` ۲۰۰، `/dashboard` → login، www → 301، meeez سالم، حافظه آزاد ۱.۴ گیگ.
**ناتمام:** cache بعضی resolverها (مثل 1.1.1.1) تا ~۱ ساعت هنوز IP لیارا می‌دهد → لیارا روشن بماند (همان دیتابیس، بی‌خطر). بعد: Stop لیارا (علی) → حذف `OUTBOX_SCHEDULER=off` و restart. push به main منتظر تأیید علی.
**ادامه (همان روز):** push به main با تأیید علی (`ecfdeda..4c1be51`؛ CI بدون job لیارا). ساعت ۱۴:۴۷ علی اپ لیارا را Stop کرد (`basharaff.liara.run` → ۵۰۳). `OUTBOX_SCHEDULER=off` از `/etc/basharaf/env` حذف شد (پشتیبان `env.before-scheduler-on.bak`) و `systemctl restart basharaf`؛ scheduler روشن، لاگ بدون خطا، basharaf.me ۲۰۰، meeez سالم. نکته: resolver 1.1.1.1 تا ~۱۵:۱۰ هنوز IP لیارا می‌داد (کاربران کمی ممکن است تا آن موقع خطا دیده باشند).
**ارتقای سرور (همان روز):** با تأیید علی پلن پارس‌پک irCloud2 → irCloud3 (علی؛ ۱۴۲٬۸۶۰ تومان) → **irCloud4** (Claude؛ ۲۸۱٬۹۱۰ تومان از اعتبار): **۲ هسته، ۴ گیگ رم، ۶۰ گیگ دیسک**؛ هر بار ری‌استارت کوتاه (۱۰–۴۰ ثانیه). بعد از آن nginx/postgres/meeez/basharaf/darayi همه active، basharaf.me ۲۰۰، scheduler روشن. همچنین به درخواست علی رکورد `A darayi.meeez.me → 94.184.45.140` (بدون پروکسی) در CDN `meeez.me` ساخته شد (پروژه‌ی darayi؛ گواهی‌اش هنوز گرفته نشده).
**باگ‌های پیدا‌شده بعد از سوئیچ (همان روز):** (۱) **منوی مشتری** `/safasity/menu` و `/safasity/menu/birun` روی VPS ۵۰۰ می‌داد: middleware با `new URL('/m', request.url)` rewrite می‌کند و پشت nginx آدرس می‌شود `https://localhost:3001/m` → `EPROTO`. رفع فوری با تأیید علی: همان rewrite در `ops/server/nginx-basharaf-proxy.conf` (`location ^~ /safasity/menu`؛ پشتیبان سرور `/root/basharaf-proxy.conf.before-menu-fix`)، `nginx -t` و reload؛ حالا ۲۰۰. اصلاح دائمی در کد هنوز مانده. (۲) **پنل پرسنل** (`/hr/staff` و ریز کارکرد `/me`): `relation "staff_statements" does not exist` — migration `project-docs/migrations/db-staff-statements.sql` (فقط یک جدول خالی) هیچ‌وقت روی production اجرا نشده؛ با اجازه‌ی صریح علی Claude از سرور با `psql -1 -f` اجرا کرد (جدول خالی + ۲ index). `/hr/staff` حالا ۲۰۰: ۱۳ پرسنل، ۴ پنل فعال، آبان بدون حضور ثبت‌شده، دستمزد ۱۲ نفر ثبت نشده، **نفر تکراری** «فاطمه کلبادی‌نژاد» / «فاطمه کلبادی نژاد» (با و بی نیم‌فاصله). مانده: وارد کردن ریز کارکرد مهر (`scripts/staff-statements-sql.ts`، با تأیید علی).
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

## 📓 2026-10-30 (۳) — ارتقای Next.js 14 → 15.5.28 و React 19 (رفع شکست deploy لیارا) — روی branch `chore/next-15-upgrade`
**چه شد:** علت شکست همه‌ی deployهای لیارا از ۲۶ اکتبر پیدا شد (لاگ از کاربر): لیارا deploy با Next.js 14.2.35 را به‌خاطر آسیب‌پذیری‌های بحرانی (اجرای کد از راه دور بدون احراز هویت: CVE-2025-55182، CVE-2026-75604، GHSA-2464-fhr4-w9xw) رد می‌کند → production هنوز روی ۱۴.x و آسیب‌پذیر است. ارتقا به Next 15.5.28 (حداقل نسخه‌ی امن ۱۵.x) + React 19. codemod رسمی `next-async-request-api` روی ۸۳ فایل (`params`/`searchParams`/`cookies()`/`headers()` حالا await می‌شوند)؛ ۵ تابع کوکی async شدند؛ `instrumentation.ts` به `instrumentation-node.ts` تقسیم شد چون Next 15 آن را برای Edge هم compile می‌کند (web-push → http/https).
**فایل‌ها:** `package.json`، `package-lock.json`، `instrumentation.ts`، `instrumentation-node.ts`، ۷۸ فایل زیر `app/`، `lib/auth/{session,customerSession,impersonation}.ts`، `lib/staff-panel/session.ts`، `lib/attendance-clock/service.ts`، `components/admin/ImpersonationBanner.tsx`، `app/pay/PayCard.tsx`. پوشه‌های snapshot قدیمی (`v0.9.*`) دست نخورد.
**Build:** tsc ✅ (با `.next/types`) · unit 762/762 ✅ · lint ۰ خطا · build ✅ · build شبیه لیارا (`npm ci --omit=dev`) ✅ · smoke test محلی build: صفحات عمومی ۲۰۰، redirect به login، API ۴۰۱، logout کوکی‌ها را پاک می‌کند ✅. تست با دیتابیس/کاربر واقعی انجام نشده.
**ناتمام:** push نشده (منتظر تأیید کاربر). ⚠️ WIP استودیو رسپی (untracked) هنوز سبک Next 14 است — قبل از commit آن، همین codemod روی `app/studio`، `app/api/recipe-studio`، `lib/recipe-studio` اجرا شود. ⚠️ `feat/tx-idempotency` باید روی این branch rebase شود.
**برای جلسه‌ی بعد:** بعد از deploy: چک‌لیست `~/Claude-Projects/CHECKLIST-merge-fix-branch.md` + ورود/خروج، پنل پرسنل `/me`، ثبت حضور `/clock`، پرداخت `/pay`.

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

