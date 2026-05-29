import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="text-[80px] font-medium text-stone-300 tabular-nums leading-none">
          ۴۰۴
        </div>
        <h1 className="text-[22px] text-stone-900 font-medium tracking-tight mt-4">
          صفحه پیدا نشد
        </h1>
        <p className="text-[13px] text-stone-500 mt-2 leading-7">
          آدرسی که وارد کرده‌اید وجود ندارد یا منتقل شده است.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center h-10 px-5 mt-6 rounded-md bg-stone-900 text-white text-[13px] hover:bg-stone-800 transition-colors"
        >
          بازگشت به داشبورد
        </Link>
      </div>
    </div>
  );
}
