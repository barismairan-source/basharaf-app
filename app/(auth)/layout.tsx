import type { ReactNode } from 'react';

/**
 * Auth layout — split-screen، کاملاً خنثی (بدون برند/نام/توصیف سیستم).
 *
 * صفحات `(auth)/` (login، signup، forgot) هیچ نشانه‌ی برند «با شرف» یا
 * ماهیت سیستم نشان نمی‌دهند — فقط فرم با عنوان عمومی. لوگو/برند حذف شده.
 *
 * Server component — فقط ساختار.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex bg-stone-50">
      {/* ─── پنل عنوان (start side — راست در RTL) — خنثی، بدون برند ─── */}
      <aside className="hidden md:flex md:w-5/12 lg:w-4/12 bg-stone-900 text-white flex-col justify-center p-10">
        <div>
          <h1 className="text-[26px] leading-[1.6] font-medium mb-4">
            ورود به حساب کاربری
          </h1>
          <p className="text-muted text-[13px] leading-7 max-w-sm">
            برای ادامه، اطلاعات خود را وارد کنید.
          </p>
        </div>
      </aside>

      {/* ─── پنل فرم (end side — چپ در RTL) ─── */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {children}
        </div>
      </main>
    </div>
  );
}
