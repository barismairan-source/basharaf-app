'use client';

import { Phone, PhoneCall, MapPin, FileText, Star, Check, ChevronDown } from 'lucide-react';
import { Chip, StatusPill } from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  AREA_LABELS, STATUS_LABELS, SHIFT_LABELS,
  type JobApplication, type ApplicationStatus, type ApplicationArea,
} from '@/lib/recruitment/questions';
import { STATUS_TONE, detectKeywords, faDate } from '@/lib/recruitment/display';
import type { FormFieldData } from '@/lib/recruitment/form-types';
import { CandidateDetail } from './CandidateDetail';

export interface CandidateCardProps {
  application: JobApplication;
  isOpen: boolean;
  onToggleOpen: () => void;
  selectionMode: boolean;
  selected: boolean;
  onToggleSelected: () => void;
  canSeePhone: boolean;
  formFields: FormFieldData[];
  customDisplayFields: FormFieldData[];
  onScoreChange: (score: number | null) => void;
  onStatusChange: (status: ApplicationStatus) => void;
  onAreaChange: (area: ApplicationArea | null) => void;
  onNoteSave: (note: string) => Promise<boolean>;
  onConvert: () => void;
  onDelete: () => Promise<boolean>;
}

/**
 * CandidateCard — یک کارت داوطلب: هدر فشرده (سه ناحیه: هویت/عملیاتی/بررسی)
 * + بدنه‌ی گسترش‌یافته (CandidateDetail) وقتی باز است.
 *
 * از پرایمیتیو مشترک `Card` استفاده نمی‌کند چون `Card` به‌طور ثابت
 * `overflow-hidden` دارد — که با هرگونه محتوای داخلی نیازمند موقعیت
 * ویژه (مثل منوی Popover که باید از لبه‌ی کارت بیرون بزند) تداخل دارد؛
 * این باکس دستی همان ظاهر (border/rounded/bg) را دارد بدون این محدودیت.
 */
export function CandidateCard({
  application: a,
  isOpen,
  onToggleOpen,
  selectionMode,
  selected,
  onToggleSelected,
  canSeePhone,
  formFields,
  customDisplayFields,
  onScoreChange,
  onStatusChange,
  onAreaChange,
  onNoteSave,
  onConvert,
  onDelete,
}: CandidateCardProps) {
  const keywords = detectKeywords(a.answers);

  function handleHeaderActivate() {
    if (selectionMode) { onToggleSelected(); return; }
    onToggleOpen();
  }

  return (
    <div
      className={cn(
        'border rounded-lg bg-surface transition-shadow',
        isOpen && 'sm:col-span-full',
        selected ? 'border-accent ring-1 ring-accent/30' : 'border-border'
      )}
    >
      {/* ── هدر کارت — سه ناحیه: هویت / عملیاتی / بررسی ── */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={selectionMode ? undefined : isOpen}
        onClick={handleHeaderActivate}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleHeaderActivate(); }
        }}
        className={cn(
          'flex w-full items-start gap-3 px-4 py-3 text-right cursor-pointer select-none rounded-lg',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-inset'
        )}
      >
        {selectionMode && (
          <span
            aria-hidden="true"
            className={cn(
              'mt-0.5 h-4 w-4 flex-shrink-0 rounded border-2 transition-colors',
              selected ? 'border-accent bg-accent' : 'border-border bg-surface'
            )}
          >
            {selected && <Check size={10} className="text-white" strokeWidth={3} />}
          </span>
        )}

        {/* ناحیه‌ی هویت: نام، بخش، سن، شماره‌ی مجاز */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[13.5px] font-medium text-text truncate">{a.firstName} {a.lastName}</span>
            {a.hasResume && <FileText size={13} className="text-muted shrink-0" aria-label="دارای رزومه" />}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <StatusPill status={a.status} label={STATUS_LABELS[a.status]} tone={STATUS_TONE[a.status]} className="text-[10.5px]" />
            {a.area && <Chip>{AREA_LABELS[a.area]}</Chip>}
            {a.age && <span className="text-[11px] text-muted">{a.age} ساله</span>}
          </div>

          {/* ناحیه‌ی عملیاتی: تماس، محل، در دسترس‌بودن، تاریخ */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] text-muted">
            {canSeePhone && (
              <span className="inline-flex items-center gap-1">
                <span dir="ltr" className="inline-flex items-center gap-1"><Phone size={11} />{a.phone}</span>
                <a
                  href={`tel:${a.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="تماس با داوطلب"
                  title="تماس با داوطلب"
                  className={cn(
                    'flex items-center justify-center w-6 h-6 rounded-md transition-colors flex-shrink-0',
                    'text-muted hover:text-ok hover:bg-ok-subtle',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1'
                  )}
                >
                  <PhoneCall size={12} strokeWidth={1.5} aria-hidden="true" />
                </a>
              </span>
            )}
            {a.city && <span className="inline-flex items-center gap-1"><MapPin size={11} />{a.city}</span>}
            {(a.shiftAvailability ?? []).slice(0, 2).map((s: string) => (
              <span key={s} className="rounded-full bg-warn-subtle px-2 py-0.5 text-[10.5px] text-warn">
                {SHIFT_LABELS[s as keyof typeof SHIFT_LABELS] ?? s}
              </span>
            ))}
            <span className="shrink-0">{faDate(a.createdAt)}</span>
          </div>

          {keywords.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {keywords.slice(0, 3).map((k) => (
                <span key={k.label} className={cn('rounded-full px-2 py-0.5 text-[10px]', k.cls)}>{k.label}</span>
              ))}
            </div>
          )}
        </div>

        {/* ناحیه‌ی بررسی: امتیاز، اقدام گسترش */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <span className="sr-only">امتیاز</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => onScoreChange(a.score === n ? null : n)}
                aria-label={`امتیاز ${n} از ۵`}
                aria-pressed={a.score != null && n <= a.score}
                className="p-0.5 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded"
              >
                <Star
                  size={14}
                  className={cn(a.score != null && n <= a.score ? 'text-amber-500' : 'text-border')}
                  fill={a.score != null && n <= a.score ? 'currentColor' : 'none'}
                />
              </button>
            ))}
          </div>
          {!selectionMode && (
            <ChevronDown size={15} className={cn('text-muted transition-transform', isOpen && 'rotate-180')} aria-hidden="true" />
          )}
        </div>
      </div>

      {isOpen && !selectionMode && (
        <CandidateDetail
          application={a}
          canSeePhone={canSeePhone}
          formFields={formFields}
          customDisplayFields={customDisplayFields}
          onStatusChange={onStatusChange}
          onAreaChange={onAreaChange}
          onNoteSave={onNoteSave}
          onConvert={onConvert}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}
