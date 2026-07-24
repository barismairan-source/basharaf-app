/**
 * Product UI V2 — تست منطق خالص کامپوننت‌های مشترک جدید (بدون رندر DOM؛
 * environment vitest پروژه 'node' است، jsdom/testing-library موجود نیست).
 *
 * پوشش:
 *  ۱. nextRadioIndex (SegFilter) — ناوبری کیبورد radiogroup، شامل معکوس‌سازی RTL.
 *  ۲. INLINE_NOTICE_TONE_CONFIG (InlineNotice) — قرارداد role/aria-live هر tone
 *     باید دقیقاً با Toast (Fix ۳ فاز قبل) هم‌خوان بماند: warning/danger → alert/
 *     assertive؛ info/success → status/polite. هر tone باید آیکن مجزا داشته باشد
 *     (نه فقط رنگ) — عدم اتکا به رنگ به‌تنهایی.
 */
import { describe, it, expect } from 'vitest';
import { nextRadioIndex } from '@/components/ui/SegFilter';
import { INLINE_NOTICE_TONE_CONFIG, type InlineNoticeTone } from '@/components/ui/InlineNotice';

describe('nextRadioIndex — ناوبری LTR (سند غیر-RTL)', () => {
  it('ArrowRight → ایندکس بعدی', () => {
    expect(nextRadioIndex('ArrowRight', 0, 4, false)).toBe(1);
  });
  it('ArrowLeft → ایندکس قبلی', () => {
    expect(nextRadioIndex('ArrowLeft', 1, 4, false)).toBe(0);
  });
  it('از آخرین گزینه ArrowRight → دور می‌زند به اولی', () => {
    expect(nextRadioIndex('ArrowRight', 3, 4, false)).toBe(0);
  });
  it('از اولین گزینه ArrowLeft → دور می‌زند به آخری', () => {
    expect(nextRadioIndex('ArrowLeft', 0, 4, false)).toBe(3);
  });
});

describe('nextRadioIndex — ناوبری RTL (معکوس‌سازی جهت بصری)', () => {
  it('در RTL، ArrowLeft معنای "بعدی" پیدا می‌کند (نه ArrowRight)', () => {
    expect(nextRadioIndex('ArrowLeft', 0, 4, true)).toBe(1);
  });
  it('در RTL، ArrowRight معنای "قبلی" پیدا می‌کند', () => {
    expect(nextRadioIndex('ArrowRight', 1, 4, true)).toBe(0);
  });
});

describe('nextRadioIndex — ArrowUp/ArrowDown مستقل از جهت سند', () => {
  it('ArrowDown همیشه بعدی است (چه RTL چه LTR)', () => {
    expect(nextRadioIndex('ArrowDown', 0, 3, true)).toBe(1);
    expect(nextRadioIndex('ArrowDown', 0, 3, false)).toBe(1);
  });
  it('ArrowUp همیشه قبلی است', () => {
    expect(nextRadioIndex('ArrowUp', 1, 3, true)).toBe(0);
    expect(nextRadioIndex('ArrowUp', 1, 3, false)).toBe(0);
  });
});

describe('nextRadioIndex — Home/End', () => {
  it('Home → همیشه ایندکس ۰', () => {
    expect(nextRadioIndex('Home', 2, 5, false)).toBe(0);
  });
  it('End → همیشه آخرین ایندکس', () => {
    expect(nextRadioIndex('End', 0, 5, false)).toBe(4);
  });
});

describe('nextRadioIndex — کلید نامربوط', () => {
  it('کلیدی غیر از فلش/Home/End → null (نه throw، نه تغییر)', () => {
    expect(nextRadioIndex('Enter', 1, 4, false)).toBeNull();
    expect(nextRadioIndex('a', 1, 4, false)).toBeNull();
  });
});

describe('INLINE_NOTICE_TONE_CONFIG — قرارداد role/aria-live', () => {
  it('warning و danger → role=alert, aria-live=assertive', () => {
    for (const tone of ['warning', 'danger'] as InlineNoticeTone[]) {
      expect(INLINE_NOTICE_TONE_CONFIG[tone].role).toBe('alert');
      expect(INLINE_NOTICE_TONE_CONFIG[tone].live).toBe('assertive');
    }
  });

  it('info و success → role=status, aria-live=polite', () => {
    for (const tone of ['info', 'success'] as InlineNoticeTone[]) {
      expect(INLINE_NOTICE_TONE_CONFIG[tone].role).toBe('status');
      expect(INLINE_NOTICE_TONE_CONFIG[tone].live).toBe('polite');
    }
  });

  it('هر tone آیکن مجزا دارد — عدم اتکا به رنگ به‌تنهایی', () => {
    const icons = (['info', 'success', 'warning', 'danger'] as InlineNoticeTone[])
      .map((t) => INLINE_NOTICE_TONE_CONFIG[t].icon);
    expect(new Set(icons).size).toBe(4);
  });
});
