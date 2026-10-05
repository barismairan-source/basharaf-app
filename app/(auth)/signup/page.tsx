import Link from 'next/link';
import { Info } from 'lucide-react';

/**
 * ثبت‌نام آزاد در این سامانه وجود ندارد — حساب‌ها را مدیر کل می‌سازد.
 * قبلاً یک فرم کامل (نام، ایمیل، رمز، پذیرش قوانین) نشان داده می‌شد که بعد از
 * پر کردن فقط می‌گفت «ثبت‌نام فعال نیست»؛ حالا همان پیام بی‌واسطه نمایش داده می‌شود.
 */
export default function SignupPage() {
  return (
    <div>
      <h2 className="text-[22px] text-stone-900 font-medium tracking-tight mb-2">
        ساخت حساب کاربری
      </h2>
      <div className="flex items-start gap-2 p-4 rounded-md bg-amber-50 border border-amber-100 text-amber-800 mt-6">
        <Info size={14} strokeWidth={1.5} className="mt-0.5 flex-shrink-0" />
        <div className="text-[12.5px] leading-7">
          ثبت‌نام آزاد در این سامانه فعال نیست. برای ساخت حساب جدید با مدیر کل
          سازمان خود تماس بگیرید.
        </div>
      </div>
      <Link
        href="/login"
        className="block mt-6 text-center text-[12.5px] text-stone-900 hover:underline"
      >
        بازگشت به صفحه ورود
      </Link>
    </div>
  );
}
