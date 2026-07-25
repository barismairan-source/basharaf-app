import type { ApplicationStatus } from './questions';
import type { FormFieldData } from './form-types';

/** نگاشت وضعیت داوطلب → tone برای Chip/StatusPill مشترک. */
export const STATUS_TONE: Record<ApplicationStatus, 'neutral' | 'amber' | 'green' | 'red'> = {
  new: 'neutral',
  shortlist: 'amber',
  accepted: 'green',
  rejected: 'red',
};

/** کلمات کلیدی برای تگ خودکار از متن پاسخ‌ها */
export const KEYWORD_TAGS: ReadonlyArray<{ pattern: RegExp; label: string; cls: string }> = [
  { pattern: /فشار|استرس|تنش/,              label: 'فشاری',       cls: 'bg-rose-50 text-rose-600'     },
  { pattern: /شلوغ/,                        label: 'شلوغی',       cls: 'bg-orange-50 text-orange-600' },
  { pattern: /صبر|آرام|خونسرد/,             label: 'صبور',        cls: 'bg-teal-50 text-teal-600'     },
  { pattern: /تیم|همکار|گروه/,              label: 'تیمی',        cls: 'bg-blue-50 text-blue-600'     },
  { pattern: /تجربه|سابقه|کار کرده|رستوران/, label: 'باتجربه',    cls: 'bg-violet-50 text-violet-600' },
  { pattern: /مشتری|رضایت|خدمات/,           label: 'مشتری‌مدار',  cls: 'bg-sky-50 text-sky-600'       },
];

export function detectKeywords(answers: Record<string, string>) {
  const text = Object.values(answers).join(' ');
  return KEYWORD_TAGS.filter((t) => t.pattern.test(text));
}

export function faDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('fa-IR'); } catch { return iso; }
}

export function renderCustomValue(val: unknown, field?: FormFieldData | null): string {
  if (val === undefined || val === null || val === '') return '—';
  if (Array.isArray(val)) {
    const labels = (val as string[]).map((v) => {
      const opt = field?.options.find((o) => o.value === v);
      return opt ? opt.label : v;
    });
    return labels.join('، ') || '—';
  }
  if (typeof val === 'string') {
    const opt = field?.options.find((o) => o.value === val);
    return opt ? opt.label : val;
  }
  return String(val);
}
