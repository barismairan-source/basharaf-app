'use client';

import { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import DatePicker from 'react-multi-date-picker';
import DateObject from 'react-date-object';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import { cn } from '@/lib/utils';

/**
 * JalaliDatePicker — یک wrapper سفارشی برای انتخاب تاریخ شمسی.
 *
 * چرا wrapper به‌جای import مستقیم در همه‌جا؟
 * - تنظیمات پیش‌فرض (calendar={persian}, locale={persian_fa}) یک جا متمرکز
 * - استایل سفارشی هماهنگ با Input/Field در سراسر اپ
 * - input به‌صورت رشته‌ی فارسی استاندارد ('۱۴۰۵/۰۲/۳۱') خوانده می‌شود
 *
 * این کامپوننت value را به‌صورت string فارسی می‌گیرد و برمی‌گرداند،
 * نه DateObject. این ساده‌ترین integration با Zod schema و فرم‌های فعلی است.
 *
 * در پروتوتایپ تاریخ‌ها رشته بودند — این هماهنگ با آن طراحی است.
 *
 * SSR-safe: کتابخانه فقط در client اجرا می‌شود، 'use client' بالا کفایت می‌کند.
 */
interface JalaliDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hasError?: boolean;
  disabled?: boolean;
  /** ID for label association */
  id?: string;
}

export function JalaliDatePicker({
  value,
  onChange,
  placeholder = '۱۴۰۵/۰۲/۳۱',
  hasError,
  disabled,
  id,
}: JalaliDatePickerProps) {
  // local DateObject state — picker نیاز به DateObject دارد، ما string می‌خواهیم
  const [internal, setInternal] = useState<DateObject | null>(() => {
    if (!value) return null;
    try {
      // فرض: value به فرمت 'YYYY/MM/DD' با ارقام فارسی است
      // DateObject با locale persian_fa می‌تواند رشته فارسی را parse کند
      return new DateObject({
        calendar: persian,
        locale: persian_fa,
        date: value,
        format: 'YYYY/MM/DD',
      });
    } catch {
      return null;
    }
  });

  function handleChange(date: DateObject | DateObject[] | null) {
    if (!date) {
      setInternal(null);
      onChange('');
      return;
    }
    // single date only
    const single = Array.isArray(date) ? date[0] : date;
    if (!single) {
      setInternal(null);
      onChange('');
      return;
    }
    setInternal(single);
    const formatted = single.format('YYYY/MM/DD');
    onChange(formatted);
  }

  return (
    <div
      className={cn(
        'relative rounded-md border bg-white transition-colors',
        hasError
          ? 'border-rose-300 focus-within:border-rose-400'
          : 'border-stone-200 focus-within:border-stone-500',
        disabled && 'bg-stone-50/60 cursor-not-allowed'
      )}
    >
      <div className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted z-10">
        <CalendarIcon size={14} strokeWidth={1.5} aria-hidden="true" />
      </div>

      <DatePicker
        id={id}
        value={internal}
        onChange={handleChange}
        calendar={persian}
        locale={persian_fa}
        format="YYYY/MM/DD"
        calendarPosition="bottom-right"
        disabled={disabled}
        placeholder={placeholder}
        // کلاس‌های inline برای input که picker render می‌کند
        inputClass={cn(
          'w-full h-10 ps-10 pe-3 bg-transparent text-[13.5px] text-stone-800 placeholder:text-stone-400 focus:outline-none rounded-md tabular-nums',
          disabled && 'cursor-not-allowed text-stone-500'
        )}
        // container parent (تخصیص می‌گیرد به portal)
        containerClassName="w-full"
        // RTL: picker خودش RTL را تشخیص می‌دهد از persian_fa
        editable={false} // فقط از طریق picker، نه type-in (که parse pitfalls دارد)
        // popper position fixed تا روی modal/panel هم درست شود
        portal
      />
    </div>
  );
}
