/**
 * JalaliDatePicker — تست منطق sync خارجی (بدون رندر React/DOM؛ پروژه
 * environment vitest را 'node' تنظیم کرده، jsdom/testing-library موجود نیست).
 *
 * کامپوننت با این invariant از loop جلوگیری می‌کند:
 *   useEffect(() => {
 *     const currentFormatted = internal ? internal.format('YYYY/MM/DD') : '';
 *     if (value === currentFormatted) return;   // ← همین خط
 *     setInternal(parseJalali(value));
 *   }, [value]);
 *
 * یعنی رفتار درست فقط وقتی تضمین می‌شود که:
 *  ۱. parseJalali(value).format(...) === همان value (round-trip پایدار) —
 *     وگرنه بعد از هر sync داخلی (از طریق onChange خود کامپوننت)، effect
 *     دوباره fire می‌شد و یک setInternal اضافه (نه لزوماً بی‌نهایت، ولی
 *     غیرضروری و بالقوه ناپایدار) ایجاد می‌کرد.
 *  ۲. یک value واقعاً متفاوت، فرمت متفاوتی تولید می‌کند — تا effect بتواند
 *     تغییر خارجی واقعی را از «همان مقدار قبلی» تشخیص دهد.
 *  ۳. ورودی نامعتبر/خالی → null امن (نه throw).
 */
import { describe, it, expect } from 'vitest';
import { parseJalali } from '@/components/ui/JalaliDatePicker';

describe('parseJalali — round-trip پایدار (شرط جلوگیری از loop)', () => {
  it.each([
    '۱۴۰۵/۰۲/۳۱',
    '۱۴۰۴/۰۱/۰۱',
    '۱۳۹۹/۱۲/۲۹',
  ])('parseJalali(%s).format(...) === همان مقدار ورودی', (value) => {
    const parsed = parseJalali(value);
    expect(parsed).not.toBeNull();
    expect(parsed!.format('YYYY/MM/DD')).toBe(value);
  });
});

describe('parseJalali — تشخیص تغییر واقعی external value', () => {
  it('دو مقدار متفاوت، فرمت‌شده‌ی متفاوت تولید می‌کنند', () => {
    const a = parseJalali('۱۴۰۵/۰۲/۳۱')!.format('YYYY/MM/DD');
    const b = parseJalali('۱۴۰۵/۰۳/۰۱')!.format('YYYY/MM/DD');
    expect(a).not.toBe(b);
  });

  it('parse کردن دوباره‌ی همان مقدار، همان فرمت را برمی‌گرداند (idempotent)', () => {
    const first = parseJalali('۱۴۰۵/۰۲/۳۱')!.format('YYYY/MM/DD');
    const second = parseJalali(first)!.format('YYYY/MM/DD');
    expect(second).toBe(first);
  });
});

describe('parseJalali — ورودی نامعتبر/خالی → null (سخت‌گیرانه)', () => {
  it('رشته‌ی خالی → null', () => {
    expect(parseJalali('')).toBeNull();
  });

  it('رشته‌ی نامعتبر → null (نه throw)', () => {
    expect(() => parseJalali('not-a-date')).not.toThrow();
    expect(parseJalali('not-a-date')).toBeNull();
  });

  it('ماه/روز خارج از محدوده که react-date-object بی‌صدا نرمال‌سازی می‌کند (۱۴۰۵/۱۳/۴۰) → null', () => {
    // خود کتابخانه isValid=true و ۱۴۰۶/۰۲/۰۹ برمی‌گرداند (rollover بی‌صدا)؛
    // چک round-trip دقیق در parseJalali این را رد می‌کند.
    expect(parseJalali('۱۴۰۵/۱۳/۴۰')).toBeNull();
  });

  it('ماه/روز صفر (۱۴۰۵/۰۰/۰۰) که نرمال می‌شود → null', () => {
    expect(parseJalali('۱۴۰۵/۰۰/۰۰')).toBeNull();
  });
});
