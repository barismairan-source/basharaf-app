'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui';
import {
  SCREENING_QUESTIONS, AREA_LABELS, STATUS_LABELS, GENDER_LABELS,
  SHIFT_LABELS, START_LABELS, REFERRAL_LABELS,
  type JobApplication,
} from '@/lib/recruitment/questions';
import { faDate } from '@/lib/recruitment/display';

const COMPARE_ROWS: Array<[string, (a: JobApplication) => string]> = [
  ['وضعیت', (a) => STATUS_LABELS[a.status]],
  ['امتیاز', (a) => (a.score ? '★'.repeat(a.score) : '—')],
  ['بخش', (a) => (a.area ? AREA_LABELS[a.area] : '—')],
  ['سن', (a) => (a.age ? `${a.age} ساله` : '—')],
  ['جنسیت', (a) => (a.gender ? GENDER_LABELS[a.gender] : '—')],
  ['محله', (a) => a.city ?? '—'],
  ['شیفت‌ها', (a) => (a.shiftAvailability ?? []).map((s) => SHIFT_LABELS[s as keyof typeof SHIFT_LABELS] ?? s).join('، ') || '—'],
  ['شروع', (a) => (a.startAvailability ? (START_LABELS[a.startAvailability as keyof typeof START_LABELS] ?? a.startAvailability) : '—')],
  ['آشنایی', (a) => (a.referralSource ? (REFERRAL_LABELS[a.referralSource as keyof typeof REFERRAL_LABELS] ?? a.referralSource) : '—')],
  ['رزومه', (a) => (a.hasResume ? 'دارد' : a.manualInfo ? 'متنی' : '—')],
  ['تاریخ', (a) => faDate(a.createdAt)],
];

export interface CompareModalProps {
  candidates: JobApplication[];
  onClose: () => void;
}

export function CompareModal({ candidates, onClose }: CompareModalProps) {
  const sharedQuestions = SCREENING_QUESTIONS.filter((q) => candidates.some((a) => a.answers[q.id]));

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="مقایسه داوطلبان"
        className="bg-surface rounded-xl w-full max-w-4xl mt-8 mb-8 overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-[16px] font-medium text-text">مقایسه داوطلبان</h2>
          <button onClick={onClose} className="text-muted hover:text-text" aria-label="بستن"><X size={18} /></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px] text-right" dir="rtl">
            <thead>
              <tr className="bg-bg">
                <th className="px-4 py-3 font-medium text-muted w-32">فیلد</th>
                {candidates.map((a) => (
                  <th key={a.id} className="px-4 py-3 font-medium text-text">{a.firstName} {a.lastName}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {COMPARE_ROWS.map(([label, fn]) => (
                <tr key={label} className="hover:bg-bg">
                  <td className="px-4 py-2.5 text-muted font-medium">{label}</td>
                  {candidates.map((a) => (
                    <td key={a.id} className="px-4 py-2.5 text-text">{fn(a)}</td>
                  ))}
                </tr>
              ))}
              {sharedQuestions.map((q) => (
                <tr key={q.id} className="hover:bg-bg">
                  <td className="px-4 py-2.5 text-muted font-medium align-top">{q.title}</td>
                  {candidates.map((a) => (
                    <td key={a.id} className="px-4 py-2.5 text-text leading-5 align-top">{a.answers[q.id] || '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <Button variant="default" onClick={onClose} icon={X}>بستن و خروج از مقایسه</Button>
        </div>
      </div>
    </div>
  );
}
