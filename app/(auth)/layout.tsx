import type { ReactNode } from 'react';
import Link from 'next/link';
import { BrandMark } from '@/components/ui';

/**
 * Auth layout — split-screen.
 *
 * در پروتوتایپ همه صفحات auth یک layout مشترک داشتند:
 * - سمت start (راست در RTL): brand bar با لوگو و نام و یک تگ‌لاین
 * - سمت end (چپ در RTL): فرم در مرکز
 *
 * این layout برای تمام صفحات داخل `(auth)/` گروه (login، signup، forgot)
 * مشترک است. این هیچ sidebar یا navigation اپلیکیشن ندارد.
 *
 * Server component — چون state ندارد و فقط ساختار است.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex bg-stone-50">
      {/* ─── Brand panel (start side — راست در RTL) ─── */}
      {/* Hidden روی موبایل، 5/12 از روی md به بالا */}
      <aside className="hidden md:flex md:w-5/12 lg:w-4/12 bg-stone-900 text-white flex-col justify-between p-10">
        <div className="flex items-center gap-3">
          <BrandMark size={36} />
          <div className="text-[15px] font-medium">با شرف</div>
        </div>

        <div>
          <h1 className="text-[26px] leading-[1.6] font-medium mb-4">
            به با شرف
            <br />
            خوش آمدید.
          </h1>
          <p className="text-muted text-[13px] leading-7 max-w-sm">
            برای ورود به حساب کاربری، اطلاعات خود را وارد کنید.
          </p>
        </div>

        <div className="text-[11.5px] text-stone-500">
          © ۱۴۰۵ با شرف
        </div>
      </aside>

      {/* ─── Form panel (end side — چپ در RTL) ─── */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* روی موبایل لوگو نمایش داده شود (چون brand panel hidden است) */}
          <div className="md:hidden flex items-center justify-center gap-3 mb-8">
            <BrandMark size={32} />
            <div className="text-[15px] font-medium text-stone-900">با شرف</div>
          </div>

          {children}
        </div>
      </main>

      {/* لینک bottom-right برای footer ساده روی موبایل */}
      <Link
        href="/login"
        className="md:hidden fixed bottom-4 inset-x-0 text-center text-[11px] text-muted"
      >
        © ۱۴۰۵ با شرف
      </Link>
    </div>
  );
}
