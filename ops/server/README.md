# اجرای basharaf-app روی VPS (همان سرور meeez)

از ۲۰۲۶-۱۰-۳۰ تصمیم گرفته شد basharaf-app از لیارا به VPS پارس‌پک (همان سرور `meeez.me`) منتقل شود. راهنمای خود سرور (کاربرها، کلیدها، فایروال، certbot): `meeez/ops/server/README.md`. **هیچ secretی در این پوشه نیست.**

## معماری

| بخش | مقدار |
|---|---|
| سرور | پارس‌پک `94.184.46.223`، Ubuntu 24.04، x86_64 (کنار meeez) |
| سرویس | `basharaf.service`، کاربر سیستمی `basharaf` (بدون ورود)، `127.0.0.1:3001` (meeez روی ۳۰۰۰) |
| کد | `/srv/basharaf/releases/<نام>` (مالک `deploy`)، نسخه‌ی فعال `/srv/basharaf/current`، cache در `/srv/basharaf/cache` |
| تنظیمات | `/etc/basharaf/env` (root، 600، همه‌ی secretها، systemd می‌خواند) و `/etc/basharaf/build.env` (root:deploy، 640، فقط `NEXT_PUBLIC_*`) |
| دیتابیس | فعلاً Postgres لیارا (آدرس **عمومی** دیتابیس در `DATABASE_URL`) |
| جلوی سرویس | Nginx + HTTPS (certbot)؛ `nginx-basharaf.conf.template` و `nginx-basharaf-proxy.conf` |
| build | **روی خود سرور** (`basharaf-release`)، چون ماژول native `sharp` دارد و مک arm64 است؛ swap ۲ گیگ برای build |

## انتشار

```bash
ops/server/deploy.sh                                   # basharaf.me
SITE=https://vps.basharaf.me ops/server/deploy.sh      # دوره‌ی تست
```

فقط HEAD commit‌شده فرستاده می‌شود (`git archive`). روی سرور: `npm ci` → `next build` با `NEXT_OUTPUT=standalone` → سوئیچ اتمی → health check روی `/login` → در صورت شکست، برگشت خودکار به نسخه‌ی قبل. نسخه‌ی فعال تا پایان build دست نمی‌خورد.

برگشت دستی و وضعیت:

```bash
ssh -i ~/.ssh/meeez_deploy deploy@94.184.46.223 basharaf-release rollback
ssh -i ~/.ssh/meeez_deploy deploy@94.184.46.223 basharaf-release status
```

## راه‌اندازی یک‌باره (انجام‌شده در ۲۰۲۶-۱۰-۳۰، idempotent)

```bash
rsync -a ops/server/ root@94.184.46.223:/root/basharaf-ops/
ssh root@94.184.46.223 bash /root/basharaf-ops/setup-server.sh base
# بعد از ساختن رکورد A برای نام تست:
ssh root@94.184.46.223 bash /root/basharaf-ops/setup-server.sh site vps.basharaf.me
```

## دوره‌ی موازی با لیارا و سوئیچ

1. در `/etc/basharaf/env` مقدار `OUTBOX_SCHEDULER=off` است تا اعلان/پیامک از هر دو سرور دوبار نرود.
2. تست روی `https://vps.basharaf.me` با همان دیتابیس و چک‌لیست `~/Claude-Projects/CHECKLIST-merge-fix-branch.md`.
3. سوئیچ (با تأیید علی): `setup-server.sh site basharaf.me www.basharaf.me` آماده می‌شود، رکورد DNS `basharaf.me` به `94.184.46.223` تغییر می‌کند، بعد از انتشار DNS `OUTBOX_SCHEDULER` حذف و `systemctl restart basharaf`. اپ لیارا تا اطمینان روشن می‌ماند (برگشت = برگرداندن DNS).
4. بعد از سوئیچ، job `deploy` در `.github/workflows/liara.yml` حذف یا غیرفعال شود تا push به main دیگر به لیارا نرود.
