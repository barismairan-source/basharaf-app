'use client';

import { useState } from 'react';
import {
  Phone, PhoneCall, Copy, MapPin, FileText, Star, Check, X,
  UserCheck, Trash2, Loader2, MoreVertical, AlertTriangle,
} from 'lucide-react';
import {
  Button, IconButton, Select, Chip, StatusPill, Popover,
  Tabs, TabPanel, InlineNotice, Textarea, useConfirm,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  SCREENING_QUESTIONS, AREA_LABELS, STATUS_LABELS, GENDER_LABELS,
  SHIFT_LABELS, START_LABELS, REFERRAL_LABELS,
  type JobApplication, type ApplicationStatus, type ApplicationArea,
} from '@/lib/recruitment/questions';
import { STATUS_TONE, renderCustomValue } from '@/lib/recruitment/display';
import type { FormFieldData, FieldSnapshot } from '@/lib/recruitment/form-types';

type NoteSaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface CandidateDetailProps {
  application: JobApplication;
  canSeePhone: boolean;
  formFields: FormFieldData[];
  customDisplayFields: FormFieldData[];
  onStatusChange: (status: ApplicationStatus) => void;
  onAreaChange: (area: ApplicationArea | null) => void;
  /** باید true/false موفقیت را برگرداند تا وضعیت «ذخیره شد»/«ناموفق» درست نمایش داده شود */
  onNoteSave: (note: string) => Promise<boolean>;
  onConvert: () => void;
  onDelete: () => Promise<boolean>;
}

/**
 * CandidateDetail — بدنه‌ی گسترش‌یافته‌ی یک کارت داوطلب.
 *
 * ساختار: هدر خلاصه (همیشه دیده می‌شود) → تب‌های خلاصه/سوال‌ها/رزومه →
 * پنل ثابت بررسی (تغییر وضعیت/بخش/امتیاز فوری در هدر کارت است، اینجا فقط
 * یادداشت + تبدیل به پرسنل + منوی خطر حذف).
 *
 * تماس/کپی شماره فقط برای نقش‌های مجاز (`canSeePhone`) رندر می‌شود —
 * نه فقط مخفی با CSS، بلکه اصلاً در DOM نیست.
 */
export function CandidateDetail({
  application: a,
  canSeePhone,
  formFields,
  customDisplayFields,
  onStatusChange,
  onAreaChange,
  onNoteSave,
  onConvert,
  onDelete,
}: CandidateDetailProps) {
  const [tab, setTab] = useState<'summary' | 'answers' | 'resume'>('summary');
  const confirm = useConfirm();
  const [deleting, setDeleting] = useState(false);

  const cf: Record<string, unknown> = (a.customFields as Record<string, unknown> | undefined) ?? {};
  const snap: FieldSnapshot[] = (a.fieldSnapshot as FieldSnapshot[] | undefined) ?? [];
  const answeredQuestions = SCREENING_QUESTIONS.filter((q) => a.answers[q.id]);

  async function handleDeleteClick() {
    const ok = await confirm({
      title: `${a.firstName} ${a.lastName} حذف شود؟`,
      description: 'این عملیات قابل بازگشت نیست — تمام اطلاعات این داوطلب (رزومه، پاسخ‌ها، یادداشت) برای همیشه پاک می‌شود.',
      confirmLabel: 'حذف داوطلب',
      danger: true,
    });
    if (!ok) return;
    setDeleting(true);
    await onDelete();
    setDeleting(false);
  }

  function copyPhone() {
    navigator.clipboard?.writeText(a.phone).catch(() => {});
  }

  return (
    <div className="border-t border-border">
      {/* محتوای قابل‌اسکرول این کارت به‌تنهایی — پنل بررسی زیرش همیشه دیده
          می‌شود بدون نیاز به position:sticky (که در یک لیست با چند کارت
          هم‌زمان باز، چند نوار "چسبیده به پایین صفحه" روی هم می‌افتادند). */}
      <div className="max-h-[55vh] overflow-y-auto">
      {/* ── هدر خلاصه ─────────────────────────────────────────────── */}
      <div className="px-4 py-3.5 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[14px] font-medium text-text">{a.firstName} {a.lastName}</span>
          <StatusPill status={a.status} label={STATUS_LABELS[a.status]} tone={STATUS_TONE[a.status]} />
          {a.area && <Chip>{AREA_LABELS[a.area]}</Chip>}
          {a.score != null && (
            <span className="inline-flex items-center gap-0.5 text-[11px] text-amber-600">
              <Star size={11} fill="currentColor" />{a.score}/۵
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-muted">
          {canSeePhone && (
            <span className="inline-flex items-center gap-1.5">
              <span dir="ltr" className="inline-flex items-center gap-1"><Phone size={12} />{a.phone}</span>
              <a
                href={`tel:${a.phone}`}
                aria-label="تماس با داوطلب"
                title="تماس با داوطلب"
                className={cn(
                  'flex items-center justify-center w-7 h-7 rounded-md transition-colors flex-shrink-0',
                  'text-muted hover:text-ok hover:bg-ok-subtle',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1'
                )}
              >
                <PhoneCall size={14} strokeWidth={1.5} aria-hidden="true" />
              </a>
              <IconButton icon={Copy} aria-label="کپی شماره" size="xs" onClick={copyPhone} />
            </span>
          )}
          {a.city && <span className="inline-flex items-center gap-1"><MapPin size={11} />{a.city}</span>}
          {a.startAvailability && (
            <span>شروع: {START_LABELS[a.startAvailability as keyof typeof START_LABELS] ?? a.startAvailability}</span>
          )}
          {a.hasResume && (
            <a href={`/api/recruitment/${a.id}/resume`} download>
              <Button variant="default" size="sm" icon={FileText}>دانلود رزومه</Button>
            </a>
          )}
        </div>
      </div>

      {/* ── تب‌ها ──────────────────────────────────────────────────── */}
      <div className="px-4">
        <Tabs
          value={tab}
          onChange={setTab}
          aria-label="جزئیات داوطلب"
          items={[
            { value: 'summary', label: 'خلاصه' },
            { value: 'answers', label: 'سوال‌ها', count: answeredQuestions.length || undefined },
            { value: 'resume', label: 'رزومه' },
          ]}
        />
      </div>

      <div className="px-4 py-4">
        <TabPanel value="summary" active={tab === 'summary'} className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {a.gender && <Chip>{GENDER_LABELS[a.gender]}</Chip>}
            {(a.shiftAvailability ?? []).map((s: string) => (
              <Chip key={s} tone="amber">{SHIFT_LABELS[s as keyof typeof SHIFT_LABELS] ?? s}</Chip>
            ))}
            {a.referralSource && (
              <Chip>{REFERRAL_LABELS[a.referralSource as keyof typeof REFERRAL_LABELS] ?? a.referralSource}</Chip>
            )}
          </div>

          {(snap.length > 0 || customDisplayFields.length > 0) && (
            <div>
              <div className="text-[10.5px] font-semibold text-muted uppercase tracking-widest mb-2">فیلدهای فرم‌ساز</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[12px] text-text/80">
                {snap.map((s) => {
                  const fieldDef = formFields.find((f) => f.key === s.key);
                  const val = cf[s.key];
                  return (
                    <div key={s.key}>
                      <span className="text-muted">{s.label}: </span>{renderCustomValue(val, fieldDef)}
                    </div>
                  );
                })}
                {customDisplayFields.filter((f) => !snap.find((s) => s.key === f.key)).map((f) => (
                  <div key={f.key}><span className="text-muted">{f.label}: </span>—</div>
                ))}
              </div>
            </div>
          )}
        </TabPanel>

        <TabPanel value="answers" active={tab === 'answers'}>
          {answeredQuestions.length === 0 ? (
            <p className="text-[12px] text-muted">داوطلب به هیچ سوالی پاسخ نداده است.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4">
              {answeredQuestions.map((q) => (
                <div key={q.id} className="border-r-2 border-accent/30 pr-3">
                  <div className="text-[10.5px] font-semibold text-muted uppercase tracking-wide mb-1">{q.prompt}</div>
                  <div className="text-[13.5px] font-medium leading-relaxed text-text">{a.answers[q.id]}</div>
                </div>
              ))}
            </div>
          )}
        </TabPanel>

        <TabPanel value="resume" active={tab === 'resume'}>
          {a.hasResume ? (
            <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
              <FileText size={18} className="text-muted shrink-0" />
              <div className="flex-1 text-[12.5px] text-text">فایل رزومه موجود است</div>
              <a href={`/api/recruitment/${a.id}/resume`} download>
                <Button variant="primary" size="sm" icon={FileText}>دانلود</Button>
              </a>
            </div>
          ) : a.manualInfo ? (
            <div className="rounded-lg bg-bg p-3 text-[12px] leading-6 text-text/90">
              <div className="mb-1 text-[11px] text-muted">اطلاعات کلی (بدون فایل رزومه)</div>
              {a.manualInfo}
            </div>
          ) : (
            <p className="text-[12px] text-muted">داوطلب رزومه‌ای ارسال نکرده است.</p>
          )}
        </TabPanel>
      </div>
      </div>

      {/* ── پنل بررسی — همیشه در دسترس، خارج از ناحیه‌ی اسکرول بالا ── */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border bg-bg/60 px-4 py-3">
        <Select
          value={a.area ?? ''}
          onChange={(e) => onAreaChange((e.target.value || null) as ApplicationArea | null)}
          className="w-32"
          aria-label="بخش"
        >
          <option value="">بخش (تعیین‌نشده)</option>
          <option value="hall">سالن</option>
          <option value="kitchen">آشپزخانه</option>
        </Select>

        <Button variant="success" size="sm" icon={Check} onClick={() => onStatusChange('accepted')}>قبول</Button>
        <Button variant="default" size="sm" icon={Star} onClick={() => onStatusChange('shortlist')}>لیست کوتاه</Button>
        <Button variant="danger" size="sm" icon={X} onClick={() => onStatusChange('rejected')}>رد</Button>
        {a.status === 'accepted' && (
          <Button variant="primary" size="sm" icon={UserCheck} onClick={onConvert}>تبدیل به پرسنل</Button>
        )}

        <div className="flex-1 min-w-[180px]">
          <ReviewNoteField initial={a.reviewerNote ?? ''} onSave={onNoteSave} />
        </div>

        <Popover
          trigger={<MoreVertical size={15} />}
          triggerLabel="اقدامات خطرناک"
          panelRole="menu"
          align="end"
        >
          {(close) => (
            <button
              type="button"
              role="menuitem"
              onClick={() => { close(); handleDeleteClick(); }}
              disabled={deleting}
              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-[12.5px] text-danger hover:bg-danger-subtle transition-colors disabled:opacity-50"
            >
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              حذف داوطلب
            </button>
          )}
        </Popover>
      </div>
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
    <div className="flex items-end gap-2">
      <div className="flex-1 min-w-[160px]">
        <Textarea
          value={val}
          onChange={(e) => { setVal(e.target.value); if (state !== 'idle') setState('idle'); }}
          rows={1}
          placeholder="یادداشت داخلی…"
          aria-label="یادداشت بررسی"
          className="min-h-[38px] py-2"
        />
      </div>
      <Button
        variant="default" size="sm" onClick={handleSave}
        disabled={val === initial || state === 'saving'}
        loading={state === 'saving'}
      >
        {state === 'saved' ? 'ذخیره شد' : 'ذخیره'}
      </Button>
      {state === 'error' && (
        <InlineNotice tone="danger" className="py-1.5 px-2.5 gap-1.5">
          <span className="flex items-center gap-1 text-[11px]"><AlertTriangle size={12} />ذخیره نشد</span>
        </InlineNotice>
      )}
    </div>
  );
}
