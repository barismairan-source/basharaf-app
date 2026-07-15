# با شرف (basharaf-app) — راهنمای سریع پروژه

## Stack
- **Framework:** Next.js 14 App Router — TypeScript strict
- **DB:** PostgreSQL + Drizzle ORM 0.36.x (driver: `postgres`) روی Liara (container پایدار)
- **Auth:** bcryptjs + jose HS256 JWT + httpOnly cookie + Edge middleware
- **UI:** Tailwind CSS + RTL-first — Vazirmatn local — lucide-react — recharts
- **Deploy:** GitHub Actions → Liara (خودکار از main)

## قوانین حیاتی (نقض نکن)
- **پول:** bigint تومان در DB؛ `toNum()` برای JSON serialize.
- **تاریخ:** جلالی text مثل `'۱۴۰۵/۰۲/۳۱'` برای کاربر؛ timestamp میلادی برای سیستم.
- **`accounts.balance`:** فیلد cache — هر reverse جامانده = drift دائمی. قبل از دست‌زدن بخش ۴ HANDOFF را بخوان.
- **`contacts.balance`:** همان قانون.
- **JWT_SECRET:** حتماً ≥۳۲ کاراکتر.
- **فرم `/apply`:** کاملاً داینامیک — فیلد hard-code اضافه نکن.

## RBAC
- `requireAdmin()` = SuperAdmin only.
- `requireSession()` = هر کاربر لاگین‌شده.
- نقش‌ها: `SuperAdmin` · `BranchUser` · `Warehouse` · `Chef`.

## معماری داده
- `db.transaction(async dbTx => { ... })` برای هر عملیات چند‌مرحله‌ای مالی.
- SELECT FOR UPDATE قبل از هر تأیید (approve) برای جلوگیری از race condition.
- `applyBalance(dbTx, tx)` برای اعمال تراکنش روی موجودی صندوق.
- `receiveConfirmed / issueConfirmed / stocktakeConfirmed` در `lib/db/inventoryHelpers.ts` برای WAC atomically.

## جریان کاری (هر تغییر کد)
```
npx tsc --noEmit   # ۰ خطا — اجباری
npm run build      # سبز — اجباری
ژورنال HANDOFF.md → commit → git push
```

## پروتکل جلسه
شروع و پایان هر جلسه طبق `CLAUDE.md` در ریشه‌ی پروژه.

## مستندات پروژه
ایندکس کامل: `project-docs/README.md`
