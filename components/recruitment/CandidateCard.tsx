'use client';

import { FileText, PanelLeftOpen } from 'lucide-react';
import { Button, Chip, StatusPill } from '@/components/ui';
import { cn } from '@/lib/utils';
import { AREA_LABELS, STATUS_LABELS, type JobApplication } from '@/lib/recruitment/questions';
import { STATUS_TONE, faDate } from '@/lib/recruitment/display';
import { CallButton, PhoneText, ScoreBadge, SelectBox, ShiftSummary, faNum } from './CandidateBits';

export interface CandidateItemProps {
  application: JobApplication;
  /** پنل جزئیات همین داوطلب باز است */
  active: boolean;
  selected: boolean;
  onToggleSelected: () => void;
  /** باز کردن پنل جزئیات — trigger برای برگرداندن فوکوس هنگام بستن */
  onOpen: (trigger: HTMLElement) => void;
  canSeePhone: boolean;
}

/** ستون‌های نمای فهرستی — سرستون و ردیف از همین یک تعریف استفاده می‌کنند تا هم‌تراز بمانند. */
export const LIST_GRID =
  'md:grid md:grid-cols-[32px_minmax(180px,1.7fr)_88px_96px_minmax(150px,1.2fr)_92px_104px_minmax(150px,auto)] md:items-center md:gap-x-3';

/** سرستون‌های نمای فهرستی (فقط دسکتاپ) */
export function CandidateListHeader() {
  return (
    <div aria-hidden="true" className={cn(LIST_GRID, 'hidden px-3 py-2 text-[11px] font-medium text-muted border-b border-border')}>
      <span />
      <span>نام</span>
      <span>بخش</span>
      <span>وضعیت</span>
      <span>شیفت</span>
      <span>تاریخ درخواست</span>
      <span>امتیاز</span>
      <span />
    </div>
  );
}

function NameBlock({ a, onOpen, canSeePhone, size }: { a: JobApplication; onOpen: (el: HTMLElement) => void; canSeePhone: boolean; size: 'row' | 'card' }) {
  const fullName = `${a.firstName} ${a.lastName}`;
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={(e) => onOpen(e.currentTarget)}
          className={cn(
            'truncate text-right font-semibold text-text hover:underline underline-offset-4 rounded-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1',
            size === 'card' ? 'text-[15px]' : 'text-[14px]'
          )}
        >
          {fullName}
        </button>
        {a.hasResume && <FileText size={13} className="text-muted shrink-0" aria-label="دارای فایل رزومه" />}
      </div>
      <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-muted">
        {canSeePhone && <PhoneText phone={a.phone} />}
        {a.age != null && <span>{faNum(a.age)} ساله</span>}
      </div>
    </div>
  );
}

/** یک ردیف نمای فهرستی (دسکتاپ). */
export function CandidateRow({ application: a, active, selected, onToggleSelected, onOpen, canSeePhone }: CandidateItemProps) {
  const fullName = `${a.firstName} ${a.lastName}`;
  return (
    <li
      data-candidate-id={a.id}
      className={cn(
        LIST_GRID,
        'px-3 py-2 border-b border-border last:border-b-0 transition-colors',
        selected ? 'bg-accent-subtle' : active ? 'bg-bg' : 'hover:bg-bg/60',
        active && 'shadow-[inset_-3px_0_0_var(--accent)]'
      )}
    >
      <SelectBox checked={selected} onChange={onToggleSelected} label={`انتخاب ${fullName} برای مقایسه`} />
      <NameBlock a={a} onOpen={onOpen} canSeePhone={canSeePhone} size="row" />
      <span className="text-[12.5px] text-text">{a.area ? AREA_LABELS[a.area] : <span className="text-muted text-[11.5px]">تعیین نشده</span>}</span>
      <span><StatusPill status={a.status} label={STATUS_LABELS[a.status]} tone={STATUS_TONE[a.status]} /></span>
      <span className="min-w-0"><ShiftSummary shifts={a.shiftAvailability} /></span>
      <span className="text-[12px] text-muted tabular-nums">{faDate(a.createdAt)}</span>
      <ScoreBadge score={a.score} />
      <div className="flex items-center justify-end gap-1.5">
        {canSeePhone && <CallButton phone={a.phone} name={fullName} />}
        <Button variant={active ? 'primary' : 'default'} size="sm" icon={PanelLeftOpen} onClick={(e) => onOpen(e.currentTarget)} aria-label={`مشاهدهٔ جزئیات ${fullName}`}>
          مشاهدهٔ جزئیات
        </Button>
      </div>
    </li>
  );
}

/** کارت داوطلب (نمای کارتی + همیشه در موبایل). */
export function CandidateCard({ application: a, active, selected, onToggleSelected, onOpen, canSeePhone }: CandidateItemProps) {
  const fullName = `${a.firstName} ${a.lastName}`;
  return (
    <li
      data-candidate-id={a.id}
      className={cn(
        'flex flex-col gap-2.5 rounded-lg border bg-surface p-3.5 transition-shadow',
        selected ? 'border-accent ring-1 ring-accent/30' : active ? 'border-accent' : 'border-border'
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className="pt-0.5"><SelectBox checked={selected} onChange={onToggleSelected} label={`انتخاب ${fullName} برای مقایسه`} /></div>
        <div className="flex-1 min-w-0"><NameBlock a={a} onOpen={onOpen} canSeePhone={canSeePhone} size="card" /></div>
        <ScoreBadge score={a.score} className="pt-1 shrink-0" />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <StatusPill status={a.status} label={STATUS_LABELS[a.status]} tone={STATUS_TONE[a.status]} />
        <Chip>{a.area ? AREA_LABELS[a.area] : 'بخش تعیین نشده'}</Chip>
      </div>

      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 text-[12px]">
        <dt className="text-muted">شیفت</dt>
        <dd className="min-w-0"><ShiftSummary shifts={a.shiftAvailability} /></dd>
        <dt className="text-muted">تاریخ درخواست</dt>
        <dd className="text-text tabular-nums">{faDate(a.createdAt)}</dd>
      </dl>

      <div className="mt-auto flex items-center gap-2 pt-1">
        <Button variant={active ? 'primary' : 'default'} size="sm" icon={PanelLeftOpen} className="flex-1" onClick={(e) => onOpen(e.currentTarget)} aria-label={`مشاهدهٔ جزئیات ${fullName}`}>
          مشاهدهٔ جزئیات
        </Button>
        {canSeePhone && <CallButton phone={a.phone} name={fullName} />}
      </div>
    </li>
  );
}
