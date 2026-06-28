import Link from 'next/link';

/**
 * صفحه‌ی روت عمومی.
 *
 * یک صفحه‌ی تمیز برای بازدیدکننده‌ی بیرونی (متقاضی همکاری) — فقط برند رستوران
 * «با شرف» + دکمه‌ی درخواست همکاری. هیچ نشانه‌ای از سیستم/پنل/حسابداری ندارد.
 * لینک کوچک «ورود کارکنان» مسیر ورود به پنل را حفظ می‌کند.
 *
 * نکته: مسیر `/` در allowlist انقضای نشست (`store/index.ts`) اضافه شده تا
 * بازدیدکننده‌ی ناشناس روی روت به /login پرت نشود.
 */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col" dir="rtl">
      {/* لینک کوچک ورود کارکنان — گوشه‌ی بالا */}
      <header className="flex justify-end p-5">
        <Link
          href="/login"
          className="text-[13px] text-stone-400 hover:text-stone-600 transition-colors"
        >
          ورود کارکنان
        </Link>
      </header>

      {/* مرکز — فقط دکمه‌ی درخواست همکاری */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <Link
          href="/apply"
          className="inline-flex items-center justify-center bg-stone-900 text-white text-[15px] font-medium px-8 py-4 rounded-2xl hover:bg-stone-800 transition-colors active:scale-[0.98]"
        >
          درخواست همکاری
        </Link>
      </main>

      <footer className="p-6 text-center text-[11px] text-stone-300">
        © ۱۴۰۵ با شرف
      </footer>
    </div>
  );
}
