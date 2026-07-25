'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, Plus, Trash2, X } from 'lucide-react';
import { Button, Input, Textarea, useConfirm } from '@/components/ui';
import { SCREENING_QUESTIONS, type ScreeningQuestion } from '@/lib/recruitment/questions';

export interface QuestionsModalProps {
  onClose: () => void;
  onSaved: () => void;
  showToast: (msg: string, tone: 'success' | 'danger') => void;
}

/** مودال مدیریت سوال‌های غربال‌گری فرم — بدون تغییر در PUT /api/recruitment/questions. */
export function QuestionsModal({ onClose, onSaved, showToast }: QuestionsModalProps) {
  const [questions, setQuestions] = useState<ScreeningQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm();

  useEffect(() => {
    fetch('/api/recruitment/questions', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setQuestions(d.questions ?? []))
      .catch(() => setQuestions([...SCREENING_QUESTIONS]))
      .finally(() => setLoading(false));
  }, []);

  function updateQuestion(i: number, patch: Partial<ScreeningQuestion>) {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }
  function addQuestion() {
    setQuestions((qs) => [...qs, { id: `q${Date.now().toString(36)}`, title: 'سوال جدید', prompt: '' }]);
  }
  async function removeQuestion(i: number) {
    const q = questions[i];
    if (q && (q.title.trim() || q.prompt.trim())) {
      const ok = await confirm({ title: 'این سوال حذف شود؟', danger: true });
      if (!ok) return;
    }
    setQuestions((qs) => qs.filter((_, idx) => idx !== i));
  }
  async function save() {
    if (questions.some((q) => !q.title.trim() || !q.prompt.trim())) {
      showToast('عنوان و متن همه سوال‌ها را پر کنید', 'danger');
      return;
    }
    setSaving(true);
    try {
      const r = await fetch('/api/recruitment/questions', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions }),
      });
      if (!r.ok) throw new Error();
      showToast('سوال‌ها ذخیره شد', 'success');
      onSaved();
    } catch {
      showToast('خطا در ذخیره سوال‌ها', 'danger');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="مدیریت سوال‌های فرم"
        className="bg-surface rounded-xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[16px] font-medium text-text">مدیریت سوال‌های فرم</h2>
          <button onClick={onClose} className="text-muted hover:text-text" aria-label="بستن"><X size={18} /></button>
        </div>
        <p className="text-[11.5px] text-muted mb-4">سوال‌ها در فرم استخدام به همین ترتیب نمایش داده می‌شوند.</p>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted" /></div>
        ) : (
          <div className="space-y-3">
            {questions.map((q, i) => (
              <div key={q.id} className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-muted w-5 flex-shrink-0 text-center">{i + 1}</span>
                  <Input className="flex-1" value={q.title} onChange={(e) => updateQuestion(i, { title: e.target.value })} placeholder="عنوان کوتاه سوال" />
                  <button onClick={() => removeQuestion(i)} className="flex-shrink-0 p-1.5 rounded-md text-muted hover:text-danger hover:bg-danger-subtle transition-colors" aria-label="حذف سوال">
                    <Trash2 size={15} />
                  </button>
                </div>
                <Textarea className="mr-7" value={q.prompt} onChange={(e) => updateQuestion(i, { prompt: e.target.value })} rows={2} placeholder="متن کامل سوال که متقاضی می‌بیند" />
              </div>
            ))}
            <button onClick={addQuestion} className="flex items-center gap-1.5 text-[12.5px] text-text hover:text-accent transition-colors">
              <Plus size={14} />افزودن سوال
            </button>
          </div>
        )}
        <div className="flex gap-2 mt-5">
          <Button variant="primary" onClick={save} loading={saving} icon={Check}>ذخیره</Button>
          <Button variant="default" onClick={onClose}>انصراف</Button>
        </div>
      </div>
    </div>
  );
}
