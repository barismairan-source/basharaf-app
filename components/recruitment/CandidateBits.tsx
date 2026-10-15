'use client';

import { PhoneCall, Star } from 'lucide-react';
import { Popover } from '@/components/ui';
import { cn } from '@/lib/utils';
import { SHIFT_LABELS } from '@/lib/recruitment/questions';

/** عدد با ارقام فارسی */
export function faNum(n: number): string {
  return n.toLocaleString('fa-IR');
}

export function shiftLabel(s: string): string {
  return SHIFT_LABELS[s as keyof typeof SHIFT_LABELS] ?? s;
}

/**
 * امتیاز فقط‌خواندنی در فهرست — امتیاز ثبت‌نشده با متن کم‌رنگ، نه ۵ ستاره‌ی خالی
 * (ستاره‌ی خالی با «امتیاز ۰» اشتباه گرفته می‌شد). ویرایش امتیاز در پنل جزئیات است.
 */
export function ScoreBadge({ score, className }: { score: number | null; className?: string }) {
  if (score == null) {
    return <span className={cn('text-[11.5px] text-muted', className)}>امتیاز ثبت نشده</span>;
  }
  return (
    <span className={cn('inline-flex items-center gap-1 text-[12.5px] font-medium text-text tabular-nums', className)} aria-label={`امتیاز ${faNum(score)} از ۵`}>
      <Star size={13} className="text-amber-500" fill="currentColor" aria-hidden="true" />
      {faNum(score)}<span className="text-muted font-normal text-[11.5px]">از ۵</span>
    </span>
  );
}

/**
 * شیفت‌ها به‌صورت «صبح و ۳ شیفت دیگر» — با کلیک/لمس بقیه نمایش داده می‌شود.
 */
export function ShiftSummary({ shifts }: { shifts: string[] | null }) {
  const list = shifts ?? [];
  if (list.length === 0) return <span className="text-[11.5px] text-muted">شیفت ثبت نشده</span>;
  const first = shiftLabel(list[0]!);
  if (list.length === 1) return <span className="text-[12.5px] text-text">{first}</span>;
  return (
    <Popover
      trigger={<span>{first} و {faNum(list.length - 1)} شیفت دیگر</span>}
      triggerLabel={`شیفت‌ها: ${list.map(shiftLabel).join('، ')}`}
      triggerClassName="h-auto min-h-[28px] px-1.5 -mx-1.5 border-0 bg-transparent text-[12.5px] text-text underline decoration-dotted underline-offset-4 hover:bg-bg"
      panelClassName="top-8 min-w-[180px]"
    >
      <ul className="p-2.5 space-y-1 text-[12.5px] text-text">
        {list.map((s) => <li key={s}>• {shiftLabel(s)}</li>)}
      </ul>
    </Popover>
  );
}

/** دکمه‌ی تماس (آیکن) — رکورد را باز نمی‌کند. */
export function CallButton({ phone, name }: { phone: string; name: string }) {
  return (
    <a
      href={`tel:${phone}`}
      aria-label={`تماس با ${name}`}
      title={`تماس با ${name}`}
      className={cn(
        'flex items-center justify-center w-8 h-8 rounded-md border border-border bg-surface transition-colors shrink-0',
        'text-muted hover:text-ok hover:bg-ok-subtle',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1'
      )}
    >
      <PhoneCall size={14} strokeWidth={1.5} aria-hidden="true" />
    </a>
  );
}

/** شماره‌ی موبایل همیشه چپ‌به‌راست (در متن راست‌به‌چپ به‌هم نمی‌ریزد). */
export function PhoneText({ phone, className }: { phone: string; className?: string }) {
  return <bdi dir="ltr" className={cn('tabular-nums', className)}>{phone}</bdi>;
}

/** چک‌باکس انتخاب برای مقایسه/دانلود — native تا کیبورد و screen reader کامل کار کنند. */
export function SelectBox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex items-center justify-center w-8 h-8 -m-1 rounded-md cursor-pointer hover:bg-bg">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={label}
        className="h-4 w-4 cursor-pointer rounded border-border accent-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1"
      />
    </label>
  );
}
