import Link from 'next/link';
import { KeyRound } from 'lucide-react';

/**
 * صفحه فراموشی رمز عبور.
 *
 * قبلاً یک فرم ایمیل بود که پیام «لینک بازیابی ارسال شد» نشان می‌داد ولی هیچ
 * ایمیلی ارسال نمی‌شد (هیچ API‌ای پشتش نبود) — کاربر منتظر ایمیلی می‌ماند که
 * هرگز نمی‌رسید. حالا مسیر واقعی را می‌گوید: مدیر کل از «مدیریت کل ← کاربران»
 * یک رمز جدید تنظیم می‌کند (POST /api/admin/users/[id]/password).
 */
export default function ForgotPage() {
  return (
    <div>
      <h2 className="text-[22px] text-stone-900 font-medium tracking-tight mb-2">
        بازیابی رمز عبور
      </h2>
      <div className="flex items-start gap-3 p-4 rounded-md bg-amber-50 border border-amber-100 text-amber-900 mt-6">
        <KeyRound size={16} strokeWidth={1.5} className="mt-0.5 flex-shrink-0" />
        <div className="text-[12.5px] leading-7">
          برای بازیابی رمز با <strong className="font-medium">مدیر کل</strong> سامانه تماس بگیرید.
          مدیر کل از بخش «مدیریت کل ← کاربران» برای شما یک رمز جدید تنظیم می‌کند؛
          بعد از ورود، آن را از «تنظیمات ← پروفایل» به رمز دلخواه خودتان تغییر دهید.
        </div>
      </div>

      <div className="text-center text-[12px] text-stone-500 mt-6">
        <Link href="/login" className="text-stone-900 hover:underline">
          بازگشت به صفحه ورود
        </Link>
      </div>
    </div>
  );
}
