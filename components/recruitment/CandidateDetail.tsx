'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Copy, FileText, Star, Check, X, UserCheck, Trash2, AlertTriangle,
  ChevronRight, ChevronLeft, CircleDot,
} from 'lucide-react';
import { Button, IconButton, Select, StatusPill, InlineNotice, Textarea, useConfirm } from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  SCREENING_QUESTIONS, AREA_LABELS, STATUS_LABELS, GENDER_LABELS,
  START_LABELS, REFERRAL_LABELS,
  type JobApplication, type ApplicationStatus, type ApplicationArea,
} from '@/lib/recruitment/questions';
import { STATUS_TONE, renderCustomValue, faDate } from '@/lib/recruitment/display';
import type { FormFieldData, FieldSnapshot } from '@/lib/recruitment/form-types';
import { CallButton, PhoneText, faNum, shiftLabel } from './CandidateBits';

type NoteSaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface CandidateDetailPanelProps {
  application: JobApplication;
  /** موقعیت در نتایج بارگذاری‌شده — برای «قبلی/بعدی» */
  position: { index: number; count: number };
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
  onClose: () => void;
  canSeePhone: boolean;
  formFields: FormFieldData[];
  customDisplayFields: FormFieldData[];
  onScoreChange: (score: number | null) => void;
  onStatusChange: (status: ApplicationStatus) => void;
  onAreaChange: (area: ApplicationArea | null) => void;
  /** باید true/false موفقیت را برگرداند تا وضعیت «ذخیره شد»/«ناموفق» درست نمایش داده شود */
  onNoteSave: (note: string) => Promise<boolean>;
  onConvert: () => void;
  onDelete: () => Promise<boolean>;
}

const STATUS_ACTIONS: Array<{ value: ApplicationStatus; label: string; icon: typeof Check; cls: string }> = [
  { value: 'new',       label: 'جدید',       icon: CircleDot, cls: 'data-[on=true]:bg-bg data-[on=true]:border-text/40' },
  { value: 'shortlist', label: 'لیست کوتاه', icon: Star,      cls: 'data-[on=true]:bg-warn-subtle data-[on=true]:border-warn/40 data-[on=true]:text-warn' },
  { value: 'accepted',  label: 'قبول',       icon: Check,     cls: 'data-[on=true]:bg-ok-subtle data-[on=true]:border-ok/40 data-[on=true]:text-ok' },
  { value: 'rejected',  label: 'رد',         icon: X,         cls: 'data-[on=true]:bg-danger-subtle data-[on=true]:border-danger/40 data-[on=true]:text-danger' },
];

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('px-5 py-4 border-b border-border', className)}>
      <h3 className="mb-2.5 text-[12px] font-semibold text-muted">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 py-1 text-[13px]">
      <dt className="text-muted">{label}</dt>
      <dd className="text-text min-w-0 break-words">{children}</dd>
    </div>
  );
}

/**
 * CandidateDetailPanel — جزئیات یک داوطلب در پنل کناری قابل‌بستن.
 * فهرست پشت پنل mount می‌ماند، پس فیلترها و موقعیت اسکرول بعد از بستن
 * دست‌نخورده‌اند؛ فوکوس به دکمه‌ای که پنل را باز کرده برمی‌گردد (در صفحه).
 * گروه‌ها: بررسی (وضعیت/امتیاز/بخش) ← تماس ← شیفت و شرایط ← رزومه ← پاسخ‌ها ← یادداشت.
 */
export function CandidateDetailPanel({
  application: a, position, onPrev, onNext, onClose,
  canSeePhone, formFields, customDisplayFields,
  onScoreChange, onStatusChange, onAreaChange, onNoteSave, onConvert, onDelete,
}: CandidateDetailPanelProps) {
  const confirm = useConfirm();
  const [deleting, setDeleting] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const fullName = `${a.firstName} ${a.lastName}`;

  const cf: Record<string, unknown> = (a.customFields as Record<string, unknown> | undefined) ?? {};
  const snap: FieldSnapshot[] = (a.fieldSnapshot as FieldSnapshot[] | undefined) ?? [];
  const answeredQuestions = SCREENING_QUESTIONS.filter((q) => a.answers[q.id]);
  const extraCustom = customDisplayFields.filter((f) => !snap.find((s) => s.key === f.key));

  // فوکوس روی عنوان با هر داوطلب جدید (باز شدن یا قبلی/بعدی) + اسکرول پنل به بالا
  useEffect(() => {
    panelRef.current?.querySelector('[data-panel-scroll]')?.scrollTo({ top: 0 });
    headingRef.current?.focus();
  }, [a.id]);

  // Escape = بستن؛ Tab داخل پنل می‌ماند (مثل بقیه‌ی دیالوگ‌های پروژه)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented) return;
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (e.shiftKey && (document.activeElement === first || document.activeElement === headingRef.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleDeleteClick() {
    const ok = await confirm({
      title: `${fullName} حذف شود؟`,
      description: 'این عملیات قابل بازگشت نیست — تمام اطلاعات این داوطلب (رزومه، پاسخ‌ها، یادداشت) برای همیشه پاک می‌شود.',
      confirmLabel: 'حذف داوطلب',
      danger: true,
    });
    if (!ok) return;
    setDeleting(true);
    await onDelete();
    setDeleting(false);
  }

  return (
    <>
      <div aria-hidden="true" onClick={onClose} className="fixed inset-0 z-40 bg-black/30 md:bg-black/15" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="candidate-panel-title"
        className="fixed inset-y-0 left-0 z-50 flex w-full flex-col bg-surface shadow-modal md:w-[540px] md:border-r md:border-border animate-fade-in"
      >
        {/* ── هدر ثابت: نام، وضعیت، قبلی/بعدی، بستن ── */}
        <header className="flex items-start gap-3 border-b border-border px-5 py-3.5">
          <div className="min-w-0 flex-1">
            <h2 id="candidate-panel-title" ref={headingRef} tabIndex={-1} className="truncate text-[17px] font-semibold text-text focus:outline-none">
              {fullName}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted">
              <StatusPill status={a.status} label={STATUS_LABELS[a.status]} tone={STATUS_TONE[a.status]} />
              <span>{a.area ? AREA_LABELS[a.area] : 'بخش تعیین نشده'}</span>
              <span aria-hidden="true">·</span>
              <span>درخواست: <span className="tabular-nums">{faDate(a.createdAt)}</span></span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="hidden sm:inline text-[11px] text-muted tabular-nums ml-1">{faNum(position.index + 1)} از {faNum(position.count)}</span>
            <IconButton icon={ChevronRight} aria-label="داوطلب قبلی" size="sm" onClick={onPrev ?? undefined} disabled={!onPrev} />
            <IconButton icon={ChevronLeft} aria-label="داوطلب بعدی" size="sm" onClick={onNext ?? undefined} disabled={!onNext} />
            <IconButton icon={X} aria-label="بستن جزئیات" size="sm" onClick={onClose} />
          </div>
        </header>

        <div data-panel-scroll className="flex-1 overflow-y-auto overscroll-contain">
          {/* ── بررسی ── */}
          <Section title="بررسی">
            <div role="group" aria-label="وضعیت" className="grid grid-cols-2 gap-1.5 min-[400px]:grid-cols-4">
              {STATUS_ACTIONS.map(({ value, label, icon: Icon, cls }) => (
                <button
                  key={value}
                  type="button"
                  data-on={a.status === value}
                  aria-pressed={a.status === value}
                  onClick={() => a.status !== value && onStatusChange(value)}
                  className={cn(
                    'inline-flex h-9 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-border bg-surface text-[12.5px] text-text transition-colors hover:bg-bg',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1',
                    'data-[on=true]:font-semibold', cls
                  )}
                >
                  <Icon size={13} strokeWidth={1.75} aria-hidden="true" />{label}
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <ScoreEditor score={a.score} onChange={onScoreChange} />
              <label className="flex items-center gap-2 text-[12.5px] text-muted">
                بخش
                <Select
                  value={a.area ?? ''}
                  onChange={(e) => onAreaChange((e.target.value || null) as ApplicationArea | null)}
                  className="w-36"
                >
                  <option value="">تعیین نشده</option>
                  <option value="hall">سالن</option>
                  <option value="kitchen">آشپزخانه</option>
                </Select>
              </label>
            </div>

            {a.status === 'accepted' && (
              <div className="mt-3">
                {a.hiredAt ? (
                  <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ok"><UserCheck size={14} strokeWidth={1.5} /> پرونده‌ی پرسنلی ساخته شده</span>
                ) : (
                  <Button variant="primary" size="sm" icon={UserCheck} onClick={onConvert}>تبدیل به پرسنل</Button>
                )}
              </div>
            )}
          </Section>

          {/* ── تماس ── */}
          <Section title="اطلاعات تماس">
            <dl>
              {canSeePhone && (
                <Row label="موبایل">
                  <span className="inline-flex items-center gap-2">
                    <PhoneText phone={a.phone} className="text-[13.5px]" />
                    <CallButton phone={a.phone} name={fullName} />
                    <IconButton icon={Copy} aria-label="کپی شماره" size="sm" onClick={() => navigator.clipboard?.writeText(a.phone).catch(() => {})} />
                  </span>
                </Row>
              )}
              <Row label="محله‌ی سکونت">{a.city || <span className="text-muted">ثبت نشده</span>}</Row>
              <Row label="سن">{a.age != null ? `${faNum(a.age)} سال` : <span className="text-muted">ثبت نشده</span>}</Row>
              <Row label="جنسیت">{a.gender ? GENDER_LABELS[a.gender] : <span className="text-muted">ثبت نشده</span>}</Row>
            </dl>
          </Section>

          {/* ── شیفت و شرایط ── */}
          <Section title="شیفت و شرایط همکاری">
            <dl>
              <Row label="شیفت‌ها">
                {(a.shiftAvailability ?? []).length > 0
                  ? (a.shiftAvailability ?? []).map(shiftLabel).join('، ')
                  : <span className="text-muted">ثبت نشده</span>}
              </Row>
              <Row label="امکان شروع">
                {a.startAvailability ? (START_LABELS[a.startAvailability as keyof typeof START_LABELS] ?? a.startAvailability) : <span className="text-muted">ثبت نشده</span>}
              </Row>
              <Row label="آشنایی از">
                {a.referralSource ? (REFERRAL_LABELS[a.referralSource as keyof typeof REFERRAL_LABELS] ?? a.referralSource) : <span className="text-muted">ثبت نشده</span>}
              </Row>
              {snap.map((s) => (
                <Row key={s.key} label={s.label}>{renderCustomValue(cf[s.key], formFields.find((f) => f.key === s.key))}</Row>
              ))}
              {extraCustom.map((f) => (
                <Row key={f.key} label={f.label}><span className="text-muted">—</span></Row>
              ))}
            </dl>
          </Section>

          {/* ── رزومه ── */}
          <Section title="رزومه">
            {a.hasResume ? (
              <div className="flex items-center gap-3 rounded-lg border border-border px-3.5 py-2.5">
                <FileText size={18} className="text-muted shrink-0" aria-hidden="true" />
                <div className="flex-1 text-[13px] text-text">فایل رزومه ارسال شده</div>
                <a
                  href={`/api/recruitment/${a.id}/resume`}
                  download
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-[12.5px] text-text hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  <FileText size={13} strokeWidth={1.5} aria-hidden="true" /> دانلود رزومه
                </a>
              </div>
            ) : a.manualInfo ? (
              <div className="rounded-lg bg-bg p-3 text-[13px] leading-7 text-text whitespace-pre-line">
                <div className="mb-1 text-[11.5px] text-muted">اطلاعات کلی (بدون فایل رزومه)</div>
                {a.manualInfo}
              </div>
            ) : (
              <p className="text-[12.5px] text-muted">داوطلب رزومه‌ای ارسال نکرده است.</p>
            )}
          </Section>

          {/* ── پاسخ‌ها ── */}
          <Section title={`پاسخ به سوال‌ها${answeredQuestions.length ? ` (${faNum(answeredQuestions.length)})` : ''}`}>
            {answeredQuestions.length === 0 ? (
              <p className="text-[12.5px] text-muted">داوطلب به هیچ سوالی پاسخ نداده است.</p>
            ) : (
              <div className="space-y-3.5">
                {answeredQuestions.map((q) => (
                  <div key={q.id} className="border-r-2 border-accent/30 pr-3">
                    <div className="text-[12px] font-semibold text-text">{q.title}</div>
                    <div className="mt-0.5 text-[11.5px] leading-5 text-muted">{q.prompt}</div>
                    <p className="mt-1.5 text-[13.5px] leading-7 text-text whitespace-pre-line">{a.answers[q.id]}</p>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* ── یادداشت ── */}
          <Section title="یادداشت داخلی" className="border-b-0">
            <ReviewNoteField key={a.id} initial={a.reviewerNote ?? ''} onSave={onNoteSave} />
          </Section>

          <div className="px-5 pb-6">
            <Button variant="danger" size="sm" icon={Trash2} onClick={handleDeleteClick} loading={deleting} disabled={deleting}>
              حذف داوطلب
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

/** ویرایش امتیاز — فقط با تعامل صریح در پنل؛ «پاک کردن» امتیاز را به «ثبت نشده» برمی‌گرداند. */
function ScoreEditor({ score, onChange }: { score: number | null; onChange: (s: number | null) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[12.5px] text-muted" id="score-label">امتیاز</span>
      <div role="group" aria-labelledby="score-label" className="flex items-center">
        {[1, 2, 3, 4, 5].map((n) => {
          const on = score != null && n <= score;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              aria-label={`امتیاز ${faNum(n)} از ۵`}
              aria-pressed={score === n}
              className="p-1 rounded touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <Star size={18} className={on ? 'text-amber-500' : 'text-muted/50'} fill={on ? 'currentColor' : 'none'} strokeWidth={1.5} />
            </button>
          );
        })}
      </div>
      {score == null ? (
        <span className="text-[11.5px] text-muted">ثبت نشده</span>
      ) : (
        <button type="button" onClick={() => onChange(null)} className="text-[11.5px] text-muted underline underline-offset-4 hover:text-text rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40">
          پاک کردن امتیاز
        </button>
      )}
    </div>
  );
}

/** فیلد یادداشت با وضعیت صریح در حال ذخیره/ذخیره‌شد/ناموفق. */
function ReviewNoteField({ initial, onSave }: { initial: string; onSave: (v: string) => Promise<boolean> }) {
  const [val, setVal] = useState(initial);
  const [state, setState] = useState<NoteSaveState>('idle');

  async function handleSave() {
    setState('saving');
    const ok = await onSave(val);
    setState(ok ? 'saved' : 'error');
    if (ok) setTimeout(() => setState((s) => (s === 'saved' ? 'idle' : s)), 2500);
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={val}
        onChange={(e) => { setVal(e.target.value); if (state !== 'idle') setState('idle'); }}
        rows={3}
        placeholder="فقط برای تیم دیده می‌شود…"
        aria-label="یادداشت داخلی"
      />
      <div className="flex items-center gap-2">
        <Button variant="default" size="sm" onClick={handleSave} disabled={val === initial || state === 'saving'} loading={state === 'saving'}>
          {state === 'saved' ? 'ذخیره شد' : 'ذخیره یادداشت'}
        </Button>
        {state === 'error' && (
          <InlineNotice tone="danger" className="py-1.5 px-2.5 gap-1.5">
            <span className="flex items-center gap-1 text-[11.5px]"><AlertTriangle size={12} />ذخیره نشد</span>
          </InlineNotice>
        )}
      </div>
    </div>
  );
}
