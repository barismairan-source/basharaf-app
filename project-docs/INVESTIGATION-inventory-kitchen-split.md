# بررسی: جداسازی «انبار» از «آشپزخانه»

> تاریخ: ۱۴۰۵-۰۴-۰۶ (2026-06-27) · اکانت ۱ · نسخه پایه: `0.9.39-prep-item-ui`
> وضعیت: فقط بررسی — هیچ کدی تغییر نکرده. تصمیم معماری منتظر تأیید کاربر.

هدف: تقسیم بخش فعلی «انبار و آشپزخانه» به دو حوزه‌ی مستقل، تا بتوان به **انباردار** فقط دسترسی انبار و به **آشپز** فقط دسترسی آشپزخانه داد.

---

## ۱. سیستم نقش و دسترسی فعلی

**نقش‌ها در دو جا تعریف شده‌اند (باید همگام بمانند):**

- `lib/db/schema.ts:46` — `pgEnum('user_role', ['SuperAdmin', 'BranchUser', 'Warehouse', 'Chef'])`
- `lib/auth/permissions.ts` — همان چهار نقش در تایپ‌ها

**خبر خوب:** نقش‌های لازم **همین حالا وجود دارند**:

| نقش (enum) | برچسب فارسی (در TeamPane) | کاربرد فعلی |
|---|---|---|
| `SuperAdmin` | مدیر کل | همه‌چیز |
| `BranchUser` | کاربر شعبه | مالی + عملیات شعبه |
| `Warehouse` | **انباردار** | انبار — بهای تمام‌شده را نمی‌بیند |
| `Chef` | **سرآشپز** | انبار + منو + داشبورد |

نقش `Warehouse` و `Chef` در `components/settings/TeamPane.tsx` قابل انتخاب‌اند (خطوط ۲۲۵–۲۲۶) و به branch گره می‌خورند.

**مشکل اصلی:** هر دو نقش `Warehouse` و `Chef` به **یک بخش واحد به نام `inventory`** نگاشت می‌شوند. هیچ بخش جدایی برای «آشپزخانه/رسپی» در مقابل «انبار» وجود ندارد.

---

## ۲. منطق `canDo` و permissionها

سیستم دسترسی **دو لایه** دارد (`lib/auth/permissions.ts`):

### الف) بخش‌ها (`SectionKey`) — «کدام منو را می‌بیند»
کنترل با `canAccessSection(user, section)`. منطق backward-compatible:
- `SuperAdmin` → همیشه همه‌چیز
- کاربر با `permissions` غیرخالی → فقط بخش‌های داخل لیست
- کاربر بدون `permissions` (null) → پیش‌فرض نقش (`defaultRoles`)

بخش‌های مرتبط:
```
{ key: 'inventory', label: 'انبار و آشپزخانه', defaultRoles: ['SuperAdmin', 'Warehouse', 'Chef'] }
{ key: 'menu',      label: 'مدیریت منو',        defaultRoles: ['SuperAdmin', 'Chef'] }
```
**یک بخش `inventory` برای هر دو حوزه.** هیچ `kitchen` یا `recipes` جدا نیست.

### ب) قابلیت‌ها (`CapabilityKey`) — «این عملیات را می‌تواند انجام دهد»
کنترل با `canDo(user, cap)`. مرتبط با انبار:
```
{ key: 'inventory.approve',   label: 'تأیید برگه‌ی انبار',                    defaultRoles: ['SuperAdmin'] }
{ key: 'inventory.viewCosts', label: 'مشاهده‌ی بهای تمام‌شده و مبالغ مالی انبار', defaultRoles: ['SuperAdmin', 'BranchUser', 'Chef'] }
```
نکته: `inventory.viewCosts` پیش‌فرض برای `Chef` بله، برای `Warehouse` خیر — یعنی همین الان آشپز بها را می‌بیند، انباردار نه.

**جمع‌بندی:** هیچ permission جدا برای «رسپی/آشپزخانه» وجود ندارد. همه زیر `inventory.*` و بخش واحد `inventory` هستند.

---

## ۳. ناوبری فعلی

**فایل:** `components/layout/nav-config.ts` (منبع واحد) — رندر در `components/layout/Sidebar.tsx` و `BottomTabBar.tsx`.

یک آیتم واحد:
```
{ href: '/inventory', label: 'انبار و آشپزخانه', icon: Package, roles: ['SuperAdmin', 'Warehouse', 'Chef'] }
```

**نحوه تصمیم نمایش (`Sidebar.tsx:89-95`):**
```ts
const canSee = (item) => {
  const section = sectionForPath(item.href);   // '/inventory' → 'inventory'
  if (!section) return item.roles.includes(user.role);
  return canAccessSection(user, section);       // permission-driven
};
```
یعنی آیتم‌هایی که `sectionForPath` برایشان بخش برمی‌گرداند **به permission گره خورده‌اند**؛ بقیه (مثل `/equipment`, `/tasks`) صرفاً به `item.roles` نگاه می‌کنند.

**اعمال در middleware (`middleware.ts:117-143`):** هر درخواست به مسیر محافظت‌شده، `sectionForPath(pathname)` را می‌گیرد و با `canAccessSection` (با داده‌ی زنده‌ی DB و کش ۵ ثانیه‌ای) چک می‌کند. اگر دسترسی نبود → ریدایرکت به `/dashboard`.

**نقطه‌ی کلیدی:** `sectionForPath` (در `permissions.ts:113`) prefix-based است:
```ts
if (pathname.startsWith('/inventory')) return 'inventory';
```
**همه‌ی** زیرمسیرهای `/inventory/*` به یک بخش می‌افتند — middleware نمی‌تواند `/inventory/recipes` را از `/inventory/receive` تفکیک کند. این گلوگاه اصلی جداسازی است.

---

## ۴. صفحه‌ی فعلی inventory و دسته‌بندی زیرمسیرها

**`app/(app)/inventory/page.tsx`** یک hub است با کارت‌ها:

**۴ کارت اصلی (Action Cards):**
| کارت | route | حوزه |
|---|---|---|
| دریافت بار | `/inventory/receive` | 🏭 انبار |
| انبارگردانی | `/inventory/stocktake` | 🏭 انبار |
| ثبت فروش | `/inventory/sales` | 🏭 انبار (کسر موجودی) |
| هشدارها | `/inventory/exceptions` | 🏭 انبار |

**«کارهای بیشتر» (MORE_ACTIONS):**
| آیتم | route | حوزه |
|---|---|---|
| اقلام انبار | `/inventory/items` | ⚠️ **مرز** (هم مواد خام=انبار، هم نیمه‌آماده=آشپزخانه) |
| کارتابل برگه‌ها | `/inventory/cartable` | 🏭 انبار |
| دستور پخت | `/inventory/recipes` | 👨‍🍳 آشپزخانه |
| گزارش مغایرت | `/inventory/variance` | ⚠️ مرز (مدیریتی/آشپزخانه) |
| برنامه تولید | `/inventory/plan` | 👨‍🍳 آشپزخانه |

**جمع‌بندی دسته‌بندی:**
- **انبار خالص:** `receive`, `stocktake`, `cartable`, `exceptions`
- **آشپزخانه خالص:** `recipes`, `plan`
- **مرزی (نیاز به تصمیم):**
  - `items` — از زمان شکاف ۴، هم مواد خام و هم نیمه‌آماده اینجاست. سخت‌ترین مورد.
  - `sales` — کسر موجودی است (انبار) ولی به فروش غذا ربط دارد.
  - `variance` — گزارش تئوری‌vs‌واقعی؛ مدیریتی، نه کار روزمره‌ی هیچ‌کدام.

**گاردهای صفحه‌ای فعلی ناهمگون‌اند:**
- بعضی صفحات role مستقیم چک می‌کنند (`receive`, `sales`, `stocktake`, `variance`, `exceptions` → `user.role === 'SuperAdmin'`/`Warehouse`)
- بعضی `canDo` (`cartable`, `items`)
- `recipes` فقط بها را برای Warehouse مخفی می‌کند
- **هیچ صفحه‌ای الان آشپز را از صفحات انبار یا برعکس بلاک نمی‌کند** — هر دو نقش به همه‌ی `/inventory/*` دسترسی دارند.

---

## ۵. پیشنهاد معماری

### تصمیم کلیدی: نقش جدید لازم **نیست**
`Warehouse` و `Chef` از قبل وجود دارند. کافی است بخش `inventory` را به دو بخش بشکنیم و مسیرها را به بخش درست نگاشت کنیم. کار اصلی روی **لایه‌ی permission و navigation** است، نه schema.

### تصمیم فرعی: مسیرها را جابجا نکنیم (کم‌ریسک)
دو راه برای جداسازی مسیر:
- **الف) نگه‌داشتن همه زیر `/inventory/*` + تفکیک در `sectionForPath`** ← پیشنهادی. بدون جابجایی فایل، بدون شکستن لینک.
- ب) انتقال آشپزخانه به `/kitchen/*` ← URL تمیزتر ولی جابجایی پوشه + به‌روزرسانی همه‌ی لینک‌های داخلی = ریسک بالاتر. فعلاً رد.

با گزینه‌ی الف، `sectionForPath` این‌طور می‌شود (ترتیب مهم است — خاص قبل از عام):
```ts
if (pathname.startsWith('/inventory/recipes')) return 'kitchen';
if (pathname.startsWith('/inventory/plan'))    return 'kitchen';
// (تصمیم درباره‌ی items/variance/sales در فاز ۲)
if (pathname.startsWith('/inventory')) return 'inventory';
```

### ⚠️ نکته‌ی مهاجرت (مهم‌ترین ریسک)
`canAccessSection`: کاربری که `permissions` صریح دارد، فقط بخش‌های داخل لیست را می‌بیند. اگر کاربری الان `['inventory']` صریح دارد و ما بخش `kitchen` را جدا کنیم، **آن کاربر دسترسی‌اش به recipes را از دست می‌دهد** (چون `kitchen` در لیستش نیست).
- کاربران بدون permissions صریح (null) → فقط با تغییر `defaultRoles` درست می‌شوند، **بدون مهاجرت داده**.
- کاربران با permissions صریح شامل `'inventory'` → نیاز به مهاجرت داده: به لیستشان `'kitchen'` هم اضافه شود تا دسترسی فعلی حفظ شود (سپس مدیر دستی هرکدام را که نباید، بردارد).

---

### نقشه‌ی مرحله‌بندی‌شده (کم‌ریسک → پرریسک)

**فاز ۰ — افزایشی، بدون تغییر رفتار (صفر ریسک)**
- `kitchen` را به `SectionKey` و `SECTIONS` اضافه کن با `defaultRoles: ['SuperAdmin', 'Chef']`.
- هنوز `sectionForPath` را دست نزن و nav را تغییر نده.
- نتیجه: هیچ‌چیز عوض نمی‌شود (بخش به هیچ مسیری نگاشت نشده). فقط زیرساخت آماده می‌شود + در پنل دسترسی (TeamPane) یک تیک جدید ظاهر می‌شود.

**فاز ۱ — مهاجرت داده‌ی محافظتی (قبل از اعمال تفکیک)**
- اسکریپت/migration: به هر کاربری که `'inventory'` در `permissions` صریح دارد، `'kitchen'` هم اضافه کن.
- این تضمین می‌کند وقتی فاز ۲ تفکیک را روشن کرد، هیچ‌کس دسترسی فعلی‌اش را از دست ندهد.
- بدون این فاز، فاز ۲ می‌تواند کاربران موجود را قفل کند.

**فاز ۲ — تفکیک مسیر + ناوبری (ریسک متوسط)**
- `sectionForPath`: `recipes` و `plan` → `'kitchen'`.
- `defaultRoles` بخش `inventory` را به `['SuperAdmin', 'Warehouse', 'BranchUser']` تغییر بده (حذف `Chef`)؛ `kitchen` → `['SuperAdmin', 'Chef']`.
- `nav-config.ts`: آیتم `/inventory` را به «انبار» تغییر بده؛ یک آیتم جدید «آشپزخانه» → `/inventory/recipes` با `section: kitchen` اضافه کن.
- صفحه‌ی hub `/inventory/page.tsx`: کارت‌های آشپزخانه (recipes/plan) را بردار (یا بر اساس `canAccessSection(user,'kitchen')` شرطی کن). در صورت تمایل یک hub آشپزخانه‌ی جدا بساز.
- تست: انباردار نباید recipes را ببیند؛ آشپز نباید receive را ببیند؛ SuperAdmin هر دو.

**فاز ۳ — رفع موارد مرزی (ریسک بالاتر، نیاز به تصمیم محصول)**
- **`items`:** چون حالا هم raw (انبار) هم prep (آشپزخانه) دارد، گزینه‌ها:
  1. در همان صفحه بماند زیر `inventory`، ولی toggle/ساخت «نیمه‌آماده» فقط برای کسانی که `kitchen` دارند فعال شود.
  2. یا صفحه‌ی اقلام را دوبخشی کن: «مواد خام» (انبار) و «نیمه‌آماده‌ها» (آشپزخانه) — تمیزتر ولی کار بیشتر.
- **`variance` و `sales`:** تصمیم بگیر هرکدام زیر کدام حوزه (یا فقط SuperAdmin/مدیریت). پیشنهاد: `variance` مدیریتی بماند (`inventory.viewCosts`-gated)، `sales` زیر انبار.
- هماهنگ‌سازی گاردهای صفحه‌ای ناهمگون با یک الگوی واحد (`canAccessSection`).

**فاز ۴ — پاک‌سازی (اختیاری)**
- اگر بعداً URL تمیز خواستیم، انتقال آشپزخانه به `/kitchen/*` با redirectهای ۳۰۸ از مسیرهای قدیمی.

---

### خلاصه‌ی ریسک

| فاز | تغییر | ریسک | مهاجرت DB؟ |
|---|---|---|---|
| ۰ | افزودن `kitchen` به SECTIONS | صفر | نه |
| ۱ | افزودن `'kitchen'` به permissionهای صریح موجود | کم | بله (محافظتی) |
| ۲ | تفکیک sectionForPath + nav + defaultRoles | متوسط | نه |
| ۳ | موارد مرزی (items/variance/sales) | متوسط-بالا | نه |
| ۴ | انتقال URL به /kitchen (اختیاری) | بالا | نه |

**توصیه:** فاز ۰ و ۱ را با هم انجام بده (بی‌خطر + آماده‌سازی)، بعد فاز ۲ را جدا commit کن و تست کن، بعد درباره‌ی فاز ۳ (مخصوصاً `items`) جداگانه تصمیم بگیر چون به محصول گره خورده.
