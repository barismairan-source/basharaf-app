# گزارش وضعیت پروژه «با شرف» — STATE SNAPSHOT

> تاریخ تهیه: ۱۴۰۵-۰۴-۰۵ | نسخه: 0.9.37-ui-bugfix | ساخته‌شده بدون تغییر کد

---

## ۱. درخت مسیر `app/` (عمق ۳)

```
app/
├── (admin)/
│   └── admin/
│       ├── audit/page.tsx              — لاگ تغییرات سیستم
│       ├── settings/
│       │   ├── financial-periods/page.tsx  — قفل دوره مالی
│       │   └── notifications/page.tsx      — قوانین اعلان
│       └── users/page.tsx              — مدیریت کاربران سیستم
│
├── (app)/                              — پنل اصلی (نیاز به JWT)
│   ├── layout.tsx
│   ├── accounts/
│   │   ├── page.tsx                    — لیست حساب‌های مالی
│   │   └── new/page.tsx                — حساب جدید
│   ├── contacts/page.tsx               — مخاطبین (تامین‌کنندگان)
│   ├── coupons/page.tsx                — کوپن‌های تخفیف
│   ├── customers/
│   │   ├── page.tsx                    — لیست مشتریان CRM
│   │   └── [id]/page.tsx               — پروفایل مشتری
│   ├── dashboard/page.tsx              — داشبورد اصلی
│   ├── employees/page.tsx              — مدیریت کارکنان
│   ├── equipment/page.tsx              — تجهیزات و نگهداری
│   ├── inventory/
│   │   ├── page.tsx                    — داشبورد انبار
│   │   ├── cartable/page.tsx           — کارتابل حواله‌ها
│   │   ├── exceptions/page.tsx         — استثناهای موجودی
│   │   ├── items/page.tsx              — اقلام انبار
│   │   ├── plan/page.tsx               — برنامه‌ریزی خرید
│   │   ├── receive/page.tsx            — دریافت کالا
│   │   ├── recipes/page.tsx            — رسپی‌ها
│   │   ├── sales/page.tsx              — فروش روزانه
│   │   ├── stocktake/page.tsx          — موجودی‌گیری
│   │   └── variance/page.tsx           — گزارش اختلاف
│   ├── logs/page.tsx                   — لاگ‌های سیستم
│   ├── menu/page.tsx                   — مدیریت منو
│   ├── orders/
│   │   ├── page.tsx                    — سفارش‌های بیرون‌بر
│   │   └── settings/page.tsx           — تنظیمات سفارش آنلاین
│   ├── payroll/page.tsx                — محاسبه و مدیریت حقوق
│   ├── purchase-orders/
│   │   ├── page.tsx                    — سفارش خرید
│   │   └── [id]/page.tsx               — جزئیات سفارش خرید
│   ├── recruitment/page.tsx            — مدیریت استخدام
│   ├── reports/page.tsx                — گزارش‌های مالی
│   ├── reservations/page.tsx           — رزرو میز
│   ├── settings/page.tsx               — تنظیمات شعبه
│   ├── tasks/page.tsx                  — وظایف روزانه
│   └── transactions/
│       ├── page.tsx                    — سند مالی (لیست)
│       └── [id]/page.tsx               — جزئیات سند
│
├── (auth)/
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   └── forgot/page.tsx
│
├── api/                                — 111 route.ts (جدول بعدی)
│
├── apply/page.tsx                      — فرم عمومی استخدام (4 مرحله)
│
├── m/
│   ├── page.tsx                        — منوی دیجیتال عمومی
│   └── [slug]/page.tsx                 — منوی دیجیتال شعبه خاص
│
└── order/
    ├── page.tsx                        — صفحه اصلی سفارش آنلاین
    ├── account/page.tsx                — ورود/پروفایل مشتری (OTP)
    ├── cart/page.tsx                   — سبد خرید
    ├── checkout/page.tsx               — تکمیل سفارش
    └── track/[token]/page.tsx          — پیگیری سفارش
```

---

## ۲. API Endpoints

| مسیر | متدها |
|------|-------|
| `/accounts` | GET POST |
| `/accounts/[id]` | DELETE PATCH |
| `/accounts/[id]/ledger` | GET |
| `/accounts/recalculate` | POST |
| `/admin/audit` | GET |
| `/admin/impersonate` | POST |
| `/admin/impersonate/end` | POST |
| `/admin/notification-rules` | GET PATCH |
| `/admin/users` | GET |
| `/admin/users/[id]` | PATCH |
| `/audit` | GET |
| `/auth/change-password` | POST |
| `/auth/login` | POST |
| `/auth/logout` | POST |
| `/auth/me` | GET |
| `/auth/permissions` | GET |
| `/branches` | GET POST |
| `/branches/[id]` | DELETE PATCH |
| `/categories` | GET POST |
| `/categories/[id]` | DELETE PATCH |
| `/contacts` | GET POST |
| `/contacts/[id]` | DELETE PATCH |
| `/contacts/[id]/ledger` | GET |
| `/coupons` | GET POST |
| `/coupons/[id]` | DELETE PATCH |
| `/coupons/validate` | POST |
| `/customer/addresses` | GET POST |
| `/customer/addresses/[id]` | DELETE PATCH |
| `/customer/auth/logout` | POST |
| `/customer/auth/send-otp` | POST |
| `/customer/auth/verify` | POST |
| `/customer/me` | GET |
| `/customer/orders` | GET |
| `/customers` | GET POST |
| `/customers/[id]` | DELETE GET PATCH |
| `/customers/[id]/loyalty` | POST |
| `/dashboard/overview` | GET |
| `/employees` | GET POST |
| `/employees/[id]` | DELETE GET PATCH |
| `/equipment` | GET POST |
| `/equipment/[id]` | DELETE PATCH |
| `/export` | GET |
| `/feedback` | GET POST |
| `/feedback/summary` | GET |
| `/financial-periods` | DELETE GET POST |
| `/inventory/expiry` | GET |
| `/inventory/forecast` | POST |
| `/inventory/items` | GET POST |
| `/inventory/items/[id]` | DELETE PATCH |
| `/inventory/items/[id]/recost` | POST |
| `/inventory/items/import` | POST |
| `/inventory/items/import/template` | GET |
| `/inventory/produce` | POST |
| `/inventory/recipes` | GET POST |
| `/inventory/recipes/[id]` | DELETE |
| `/inventory/recipes/[id]/costing` | GET |
| `/inventory/recipes/import` | POST |
| `/inventory/recipes/import/template` | GET |
| `/inventory/reports/exceptions` | GET |
| `/inventory/reports/variance` | GET |
| `/inventory/stocktake` | POST |
| `/inventory/vouchers` | GET POST |
| `/inventory/vouchers/[id]` | DELETE |
| `/inventory/vouchers/[id]/approve` | POST |
| `/inventory/vouchers/[id]/reject` | POST |
| `/inventory/vouchers/[id]/reversal` | POST |
| `/logs` | DELETE GET |
| `/maintenance` | GET POST |
| `/menu` | GET |
| `/menu/categories` | POST |
| `/menu/categories/[id]` | DELETE PATCH |
| `/menu/items` | POST |
| `/menu/items/[id]` | DELETE PATCH |
| `/menu/settings` | PATCH |
| `/notifications` | GET PATCH |
| `/orders` | GET |
| `/orders/[id]/status` | PATCH |
| `/orders/settings` | GET PATCH |
| `/orders/zones` | GET POST |
| `/orders/zones/[id]` | DELETE PATCH |
| `/payroll/events` | GET POST |
| `/payroll/events/[id]` | DELETE |
| `/payroll/runs` | GET POST |
| `/payroll/runs/[id]` | GET |
| `/payroll/runs/[id]/approve` | POST |
| `/payroll/runs/[id]/calculate` | POST |
| `/payroll/runs/[id]/post` | DELETE POST |
| `/public/order/create` | POST |
| `/public/order/menu` | GET |
| `/public/order/pay/callback` | GET |
| `/public/order/pay/request` | POST |
| `/public/order/track/[token]` | GET |
| `/purchase-orders` | GET POST |
| `/purchase-orders/[id]` | DELETE PATCH |
| `/purchase-orders/[id]/receive` | POST |
| `/purchase-orders/suggestions` | GET |
| `/recruitment` | GET POST |
| `/recruitment/[id]` | DELETE PATCH |
| `/recruitment/questions` | GET PUT |
| `/recruitment/upload` | POST |
| `/reports` | GET |
| `/reservations` | GET POST |
| `/reservations/[id]` | DELETE PATCH |
| `/settings` | GET PATCH |
| `/settings/wipe` | POST |
| `/tables` | GET POST |
| `/tables/[id]` | DELETE PATCH |
| `/task-templates` | GET POST |
| `/task-templates/[id]` | PATCH |
| `/tasks` | GET |
| `/tasks/[id]` | PATCH |
| `/tasks/generate-today` | POST |
| `/transactions` | GET POST |
| `/transactions/[id]` | DELETE GET PATCH |
| `/transactions/[id]/approve` | POST |
| `/transactions/[id]/reject` | POST |
| `/transactions/import` | POST |
| `/transactions/import/template` | GET |
| `/upload` | DELETE POST |
| `/users` | GET POST |
| `/users/[id]` | DELETE PATCH |

**مجموع: ۱۱۱ route.ts**

---

## ۳. جداول دیتابیس (`lib/db/schema.ts`)

| جدول | شرح |
|------|-----|
| `branches` | شعب رستوران |
| `users` | کاربران سیستم (پرسنل، با `is_active`) |
| `categories` | دسته‌بندی تراکنش‌های مالی |
| `transactions` | اسناد مالی — Maker-Checker (pending/approved/rejected) |
| `notifications` | اعلان‌های درون‌سیستمی کاربران |
| `app_settings` | تنظیمات سراسری اپ (یک ردیف به ازای هر شعبه) |
| `notification_rules` | قوانین ارسال اعلان بر اساس نوع رویداد |
| `audit_log` | لاگ تغییرات مهم (WHO+WHAT+WHEN) |
| `accounts` | حساب‌های مالی — `balance` فیلد cache bigint |
| `contacts` | مخاطبین (تامین‌کنندگان، مشتریان کسب‌وکاری) |
| `job_applications` | فرم‌های استخدام + رزومه base64 |
| `menu_categories` | دسته‌بندی آیتم‌های منو |
| `menu_items` | آیتم‌های منو (با `in_takeaway`, `vat_rate`) |
| `menu_settings` | تنظیمات نمایش منوی دیجیتال هر شعبه |
| `system_logs` | لاگ‌های عملیاتی سیستم |
| `employees` | اطلاعات پرسنلی کارکنان |
| `employee_documents` | مدارک آپلودشده کارکنان |
| `payroll_events` | رویدادهای حقوقی (اضافه‌کاری، غیبت، پاداش، کسر) |
| `payroll_parameters` | پارامترهای محاسبه حقوق هر شعبه |
| `payroll_runs` | اجرای محاسبه حقوق ماهانه |
| `payslips` | فیش حقوقی هر کارمند در هر دوره |
| `journal_vouchers` | اسناد حسابداری دوطرفه (debits/credits JSON) |
| `inv_items` | اقلام انبار (با واحد، قیمت تمام‌شده، نقطه سفارش) |
| `inv_recipes` | رسپی‌های اقلام فروختنی |
| `inv_recipe_lines` | خطوط رسپی (ماده اولیه + مقدار) |
| `inv_vouchers` | حواله‌های انبار — Maker-Checker |
| `inv_voucher_lines` | خطوط حواله انبار |
| `inv_stock_tx` | تراکنش‌های موجودی (immutable ledger) |
| `inv_daily_sales` | فروش روزانه برای کسر خودکار انبار |
| `customers` | مشتریان CRM/باشگاه وفاداری |
| `loyalty_entries` | رویدادهای کسب/صرف امتیاز وفاداری |
| `coupons` | کوپن‌های تخفیف (درصدی/مقداری) |
| `coupon_redemptions` | تاریخچه استفاده از کوپن |
| `restaurantTables` | میزهای رستوران |
| `reservations` | رزرو میز |
| `feedback` | بازخورد مشتریان |
| `purchase_orders` | سفارش‌های خرید از تامین‌کننده |
| `purchase_order_items` | اقلام سفارش خرید |
| `equipment` | تجهیزات رستوران |
| `maintenance_logs` | لاگ‌های تعمیر و نگهداری تجهیزات |
| `task_templates` | قالب‌های وظیفه تکرارشونده |
| `task_instances` | نمونه‌های اجرای وظیفه (روزانه/دوره‌ای) |
| `ord_settings` | تنظیمات سفارش بیرون‌بر هر شعبه |
| `ord_zones` | مناطق ارسال با هزینه متفاوت |
| `web_customers` | مشتریان آنلاین (مستقل از CRM customers) |
| `web_customer_addresses` | آدرس‌های مشتریان آنلاین |
| `web_customer_otp` | کدهای OTP برای لاگین مشتریان آنلاین |
| `orders` | سفارش‌های بیرون‌بر (ارسال/پیکاپ) |
| `order_lines` | اقلام سفارش (snapshot قیمت در لحظه ثبت) |
| `order_events` | تاریخچه تغییر وضعیت سفارش |
| `financial_periods` | دوره‌های مالی بسته‌شده (قفل تراکنش) |

**مجموع: ۵۱ جدول**

---

## ۴. ارزیابی تکمیل ماژول‌ها

| ماژول | وضعیت | توضیح |
|-------|--------|-------|
| **انبار** (Inventory) | کامل ✅ | حواله‌های Maker-Checker، رسپی، موجودی‌گیری، برنامه‌ریزی، استثنا، گزارش اختلاف، واردات Excel |
| **حسابداری** (Accounting) | کامل ✅ | تراکنش‌ها، حساب‌ها، دفتر روزنامه، قفل دوره مالی، واردات Excel |
| **HR/حقوق** (Payroll) | کامل ✅ | کارکنان، مستندات، رویدادهای حقوقی، محاسبه، تأیید، فیش حقوقی |
| **مشتریان** (CRM/Loyalty) | کامل ✅ | پروفایل، باشگاه وفاداری، امتیاز، کوپن، بازخورد |
| **عملیات** (Operations) | نیمه‌کاره ⚠️ | سفارش آنلاین کامل؛ رزرو میز UI ساده؛ وظایف روزانه پایه |
| **استخدام** (Recruitment) | کامل ✅ | فرم عمومی ۴ مرحله‌ای، رزومه base64، سوالات پویا، مدیریت متقاضیان |
| **مالیات/معین** (VAT/Moadian) | فقط API ⚠️ | endpoint مالیاتی وجود ندارد؛ `vat_rate` در `menu_items` موجود است اما UI یا ارسال به معین نیست |
| **منوی دیجیتال** (Digital Menu) | کامل ✅ | `/m/[slug]` عمومی، مدیریت منو در پنل، تنظیمات نمایش |
| **بهای تمام‌شده رسپی** (Recipe Costing) | نیمه‌کاره ⚠️ | مدل + API (`/inventory/recipes/[id]/costing`) موجود؛ UI نمایش بهای تمام‌شده ناقص |
| **سفارش خرید** (Purchase Orders) | نیمه‌کاره ⚠️ | DB + API کامل، UI لیست و جزئیات هست، اتصال خودکار به انبار (دریافت→حواله) ناقص |

---

## ۵. TODO / FIXME / موقت

| فایل | خط | محتوا |
|------|----|--------|
| `lib/ordering/webCustomer.ts` | 71–72 | `[OTP MOCK]` — کد OTP به جای ارسال SMS فقط در console لاگ می‌شود |
| `lib/repos/api.ts` | 328 | endpoint dummy برای session — برای اهداف داخلی |
| `store/slices/appSettingsSlice.ts` | 42 | fallback‌های hardcode در صورت خطای بارگذاری تنظیمات |
| `store/slices/transactionsSlice.ts` | 121 | کامنت `// جایگزین temp با real` |

---

## ۶. داده‌های Mock/Hardcode

| مکان | نوع | شرح |
|------|-----|-----|
| `lib/ordering/webCustomer.ts:71-72` | Mock عملکردی | OTP واقعی ارسال نمی‌شود — کد فقط `console.log` می‌کند. باید با Kavenegar / Melipayamak یا SMS provider واقعی جایگزین شود |
| `store/slices/appSettingsSlice.ts:42` | Hardcode Fallback | مقادیر پیش‌فرض تنظیمات در صورت fail بودن API |
| `app/(app)/dashboard/page.tsx` | ویجت‌های داشبورد | داده‌های داشبورد از `/api/dashboard/overview` می‌آیند (واقعی)؛ بررسی نشد که تمام ویجت‌ها live باشند |

---

## یادداشت‌های مهم

- **پول:** همه‌ی مبالغ `bigint` تومان — هیچ‌جا float نیست
- **تاریخ:** تاریخ کاربری `text` شمسی — هیچ‌جا `Date` object برای تاریخ ذخیره نمی‌شود
- **`accounts.balance`:** فیلد cache است — هر reverse جامانده = drift دائمی
- **JWT:** `basharaf-session` (اصلی) + `basharaf-imp` (جعل هویت، ۴ ساعت)
- **CI/CD:** GitHub Actions → Liara `basharaff` — نیازی به ZIP نیست (از 2026-06-24)
- **Migrations pending:** ۴ فایل SQL آماده اجرا در pgAdmin هستند
- **Tests:** 32/32 Vitest unit tests پاس
