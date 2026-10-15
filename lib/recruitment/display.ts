import type { ApplicationStatus } from './questions';
import type { FormFieldData } from './form-types';

/** نگاشت وضعیت داوطلب → tone برای Chip/StatusPill مشترک. */
export const STATUS_TONE: Record<ApplicationStatus, 'neutral' | 'amber' | 'green' | 'red'> = {
  new: 'neutral',
  shortlist: 'amber',
  accepted: 'green',
  rejected: 'red',
};

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
