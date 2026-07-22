import { describe, it, expect } from 'vitest';
import { formatSignedMoney, formatMoneyParts, formatMoney, formatMoneyShort } from '@/lib/design/format';

const MINUS = '−';
const LRI = '⁦';
const PDI = '⁩';
const HYPHEN = '-'; // U+002D — نباید هرگز به‌جای MINUS استفاده شود

describe('formatSignedMoney — علامت استاندارد یونیکد و LTR isolate', () => {
  it('مقدار منفی: علامت U+2212 دارد، نه هایفن معمولی', () => {
    const out = formatSignedMoney(-6_500_000_000, { short: true });
    expect(out).toContain(MINUS);
    expect(out).not.toContain(HYPHEN);
  });

  it('مقدار مثبت بدون showPlus: بدون علامت', () => {
    const out = formatSignedMoney(4_999);
    expect(out.startsWith(LRI)).toBe(true);
    expect(out).not.toContain(MINUS);
    expect(out).not.toContain('+');
  });

  it('مقدار مثبت با showPlus:true → علامت +', () => {
    const out = formatSignedMoney(500_000, { showPlus: true });
    expect(out).toContain('+');
    expect(out).not.toContain(MINUS);
  });

  it('صفر: نه + نه − (صفر نه مثبت است نه منفی)', () => {
    const out = formatSignedMoney(0, { showPlus: true });
    expect(out).not.toContain(MINUS);
    expect(out).not.toContain('+');
  });

  it('مقیاس میلیاردی: خلاصه‌سازی صحیح با علامت درست', () => {
    const out = formatSignedMoney(-5_400_000_000, { short: true, showPlus: true });
    expect(out).toContain(MINUS);
    expect(out).toContain('میلیارد');
  });

  it('کل علامت+عدد+واحد داخل یک LTR isolate واحد قرار دارد', () => {
    const out = formatSignedMoney(-1_200_000, { showPlus: true });
    expect(out.startsWith(LRI)).toBe(true);
    expect(out.endsWith(PDI)).toBe(true);
    // فقط یک جفت isolate — نه isolate‌های تودرتوی جداگانه برای علامت و عدد
    expect(out.indexOf(LRI)).toBe(out.lastIndexOf(LRI));
    expect(out.indexOf(PDI)).toBe(out.lastIndexOf(PDI));
  });
});

describe('formatMoneyParts — برای نمایش عدد/واحد جدا (KPICard)', () => {
  it('منفی: main شامل MINUS است، unit همیشه "تومان"', () => {
    const { main, unit } = formatMoneyParts(-6_000_000);
    expect(main).toContain(MINUS);
    expect(main).not.toContain(HYPHEN);
    expect(unit).toBe('تومان');
  });

  it('صفر: main بدون علامت', () => {
    const { main } = formatMoneyParts(0);
    expect(main).not.toContain(MINUS);
  });

  it('میلیاردی: کوتاه‌سازی صحیح', () => {
    const { main } = formatMoneyParts(5_400_000_000);
    expect(main).toContain('میلیارد');
  });
});

describe('formatMoney / formatMoneyShort — عدم رگرسیون رفتار قبلی', () => {
  it('formatMoney شامل واحد تومان و علامت درست است', () => {
    expect(formatMoney(-5000)).toContain(MINUS);
    expect(formatMoney(-5000)).toContain('تومان');
    expect(formatMoney(-5000)).not.toContain(HYPHEN);
  });

  it('formatMoneyShort زیر ۱۰هزار فرمت کامل برمی‌گرداند', () => {
    expect(formatMoneyShort(4_999)).toContain('۴,۹۹۹');
  });

  it('formatMoneyShort منفی میلیونی', () => {
    const out = formatMoneyShort(-6_000_000);
    expect(out).toContain(MINUS);
    expect(out).toContain('میلیون');
  });
});
