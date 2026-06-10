# handoff-archive.md — ژورنال‌های آرشیوشده

## 📓 2026-06-09 — رفع ۴ باگ بحرانی + اصلاح Sidebar — اکانت _(؟)_
**چه شد:** حفاظ‌های حذف: صندوق با مانده≠۰ → خطای ۴۰۹ فارسی؛ طرف‌حساب با بدهی/طلب → ۴۰۹؛ کوپن GET فیلتر isActive؛ حذف کاربر دارای تراکنش → ۴۰۹. Sidebar: برچسب‌ها اصلاح شد.
**فایل‌ها:** `app/api/accounts/[id]/route.ts`، `app/api/contacts/[id]/route.ts`، `app/api/coupons/route.ts`، `app/api/users/[id]/route.ts`، `components/layout/Sidebar.tsx`.
**Build:** سبز ✅ | **ناتمام:** —

## 📓 2026-06-09 — بازطراحی UX ناوبری (Sidebar/Mobile) — اکانت _(؟)_
**چه شد:** Sidebar دسکتاپ ۲۴۰/۶۴px با toggle؛ موبایل: drawer راست + BottomTabBar (۵ تب، مجوزمحور، tap target ≥۴۸px).
**فایل‌ها:** `types/preferences.ts`، `components/layout/Sidebar.tsx`، `MobileMenu.tsx`، `BottomTabBar.tsx`، `layout/index.ts`، `app/(app)/layout.tsx`.
**Build:** سبز ✅ | **ناتمام:** —

---

> ورودی‌های قدیمی‌تر از HANDOFF.md که برای نگهداری تاریخچه منتقل شده‌اند.

---

## 📓 2026-06-09 — آدیت دامین‌لاجیک — اکانت _(؟)_
**چه شد:** گزارش در `project-docs/domain-audit.md`. چهار 🔴 (حذف صندوق/طرف‌حساب بدون چک مانده، کوپن بدون فیلتر isActive، crash حذف کاربر) + دو 🟡 sidebar. هیچ کدی تغییر نکرد. (🔴ها در ورودی‌های بعدی رفع شدند.)
**فایل‌ها:** `project-docs/domain-audit.md` (جدید).
**Build:** بدون تغییر کد.
**ناتمام:** —
**برای جلسه‌ی بعد:** رفع چهار 🔴 (انجام شد).

## 📓 2026-06-09 — رفع باگ حذف قلم انبار — اکانت _(؟)_
**چه شد:** حذف قلم soft-delete است (`isActive=false` به‌خاطر FK restrict) ولی GET فیلتر نداشت → قلم بعد از refresh برمی‌گشت. اصلاح: `ne(isActive,false)` در where برای همه‌ی نقش‌ها.
**فایل‌ها:** `app/api/inventory/items/route.ts`.
**Build:** سبز ✅
**ناتمام:** —
