# بررسی به‌روزرسانی: شکاف ۱ (sync قیمت) و شکاف ۳ (variance) — رسپی‌ساز

> تاریخ: ۱۴۰۵-۰۴-۰۷ (2026-06-28) · اکانت ۱ · نسخه پایه: `0.9.47`
> این دو شکاف هفته‌ها پیش با agentها بررسی شدند ولی پیاده نشدند. این سند **تأیید مجدد فرضیات** با کد فعلی است (بعد از جداسازی انبار/آشپزخانه و صفحه‌ی prep جدا).

---

## ✅ نتیجه‌ی تأیید: فرضیات هر دو شکاف هنوز معتبرند

### شکاف ۱ — sync قیمت (`inv_recipes.price` ↔ `menu_items.price`)

| فرضیه‌ی قدیمی | وضعیت فعلی | محل |
|---|---|---|
| costing از `inv_recipes.price` می‌خواند | ✅ معتبر | `costing/route.ts:51` → `Number(recipe.price)` |
| wizard رسپی `menuItemId` نمی‌نویسد | ✅ معتبر | `recipes/route.ts` — `saveSchema` فیلد `menuItemId` ندارد؛ insert/update هم نمی‌نویسد |
| `inv_recipes.menuItemId` FK وجود دارد | ✅ معتبر | `schema.ts:900` |
| client الان `menuItemId` را دریافت می‌کند ولی استفاده نمی‌کند | ✅ معتبر | `rowToInvRecipe` خط ۵۹ آن را serialize می‌کند |
| `menu_items.price` + `priceTakeaway` موجود + serialize می‌شوند | ✅ معتبر | `menuSerializers.ts:11-12` |
| هیچ sync کدی وجود ندارد | ✅ معتبر | جستجو شد — هیچ |

**تغییر از زمان بررسی قبلی (بی‌اثر روی نقشه):** recipe POST حالا `requireRole('SuperAdmin','Chef')` است (آشپز هم می‌تواند رسپی بسازد). wizard همچنان در `recipes/page.tsx` است.

### شکاف ۳ — variance بر اساس فروش واقعی

| فرضیه‌ی قدیمی | وضعیت فعلی | محل |
|---|---|---|
| theoretical فقط از `inv_voucher_lines` kind=sale | ✅ معتبر | `variance/route.ts:42-50` |
| فیلتر روی `voucher.updatedAt` (نه تاریخ فروش) | ✅ معتبر | خط ۳۷-۳۸ |
| مسیرهای ۲/۳ (تراکنش/سفارش) حواله نمی‌سازند → نامرئی | ✅ معتبر | بدون تغییر |
| **پیش‌نیاز چک‌نشده: آیا `inv_stock_tx` ستون تاریخ شمسی دارد؟** | ✅ **بله دارد** | `schema.ts:1025` → `jalaliDate: text('jalali_date').notNull()` |

**🎯 پیش‌نیاز حل شد:** `inv_stock_tx.jalali_date` موجود و `notNull` است → بازسازی actual با فیلتر تاریخ شمسی **بدون migration ممکن است**.

**دو نکته‌ی جدید مهم برای پیاده‌سازی شکاف ۳:**
1. ⚠️ `inv_stock_tx` ستون `branchId` **ندارد**. فیلتر شعبه برای actual باید via JOIN به `inv_items.branchId` باشد (یا via voucherId که برای مسیر ۲/۳ null است → پس join به items امن‌تر است).
2. `inv_stock_tx` روی `jalali_date` ایندکس ندارد (فقط `item_idx` و `created_idx`). برای بازه‌های بزرگ یک ایندکس `(item_id, jalali_date)` کمک می‌کند — اختیاری، فایل migration می‌سازم (اجرا با کاربر).
3. `inv_daily_sales` ستون `branchId` **دارد** (`schema.ts:1044`) → theoretical از inv_daily_sales مستقیم با branchId فیلتر می‌شود (join لازم نیست).

---

## شکل داده‌ی `inv_daily_sales.lines` (دو شکل در دیتابیس)

- مسیر ۱ (صفحه‌ی فروش → حواله sale → approve): `{ recipeId, name, count, unitPrice }`
- مسیر ۲/۳ (تأیید تراکنش / سفارش): `{ recipeId, name, qty, cogs }`

→ کلید کمیت ممکن است `count` یا `qty` باشد. در بازسازی باید `qty ?? count` گرفته شود.

---

## نقشه‌ی پیاده‌سازی (به‌روز)

### شکاف ۱ — گزینه‌ی B (دو قیمت مستقل + هشدار اختلاف + لینک اختیاری)
۱. `recipes/route.ts`: افزودن `menuItemId: z.string().uuid().nullable().optional()` به `saveSchema` + نوشتن در insert/update.
۲. wizard (`recipes/page.tsx`): سلکتور اختیاری «لینک به آیتم منو» (fetch `/api/menu`). دکمه‌ی اختیاری «استفاده از قیمت منو» که `price` را از `menu_items.price` پر کند (جایگزین خودکار نمی‌کند — کاربر تصمیم می‌گیرد).
۳. `costing/route.ts`: اگر `recipe.menuItemId` ست بود، join به `menu_items` و برگرداندن `menuPrice` (+ `menuPriceTakeaway`) در خروجی costing.
۴. `RecipeCard`: اگر `menuItemId` ست و `menuPrice !== recipe.price` → نشان «قیمت منو X با قیمت رسپی Y فرق دارد». نشانه‌ی کوچک «لینک به منو».
۵. **audit:** تغییر `price` رسپی داده‌ی مالی است. الان recipe save هیچ audit ندارد — بررسی می‌کنم آیا helper `auditLog` هست و یک ثبت هنگام تغییر قیمت اضافه می‌کنم (طبق قانون پروژه).
- پول bigint تومان (قیمت‌ها از قبل bigint). ارقام فارسی با `formatNumericInputValue`/`normalizeDigits`.

### شکاف ۳ — نمای دوم افزایشی (گزارش قدیمی دست‌نخورده)
۱. variance route: پارامتر `?source=voucher|daily` (پیش‌فرض `voucher` = رفتار فعلی). برای `daily`:
   - **theoretical:** برای هر ردیف `inv_daily_sales` در بازه (فیلتر `jalaliDate` + `branchId`)، برای هر خط `lines`: `qty = line.qty ?? line.count`؛ join به `inv_recipes`+`inv_recipe_lines`+`inv_items`؛ `theoreticalQtyBase += qty / portions × rl.qtyBase × (100 / COALESCE(override_pct, yield_pct, 100))`.
   - **actual:** `SUM(-delta_base)` از `inv_stock_tx` kind∈(out,waste,sale)، فیلتر `jalali_date` در بازه + join `inv_items.branchId = ?`.
۲. صفحه‌ی `variance/page.tsx`: یک toggle «نمای حواله / نمای فروش واقعی» — هر دو قابل مقایسه.
۳. migration اختیاری: ایندکس `inv_stock_tx(item_id, jalali_date)` — فایل می‌سازم، **اجرا با کاربر**.
- پول bigint. ارقام فارسی در UI.

---

## ترتیب + ریسک

| شکاف | ریسک | migration | رویکرد |
|---|---|---|---|
| ۱ (sync قیمت) | کم | نه | افزایشی؛ دو قیمت مستقل می‌مانند |
| ۳ (variance) | متوسط | اختیاری (فقط ایندکس perf) | نمای دوم؛ گزارش قدیمی دست‌نخورده |

**توقف بین ۱ و ۳ برای تست کاربر.**
