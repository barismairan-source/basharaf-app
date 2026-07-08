'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, GripVertical, Trash2, Eye, EyeOff, Check, X, ChevronDown, ChevronUp,
  Settings2, Loader2, AlertTriangle, RefreshCw, Save, Smartphone, Monitor,
} from 'lucide-react';
import { Button, Input, Select, Empty } from '@/components/ui';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import type {
  FormStructure, FormSectionData, FormFieldData,
  FormFieldOptionData, FormFieldConditionData,
  FormFieldType, FormFieldScope, FormFieldWidth,
  ConditionOperator, ConditionAction,
} from '@/lib/recruitment/form-types';
import {
  FIELD_TYPE_LABELS, SCOPE_LABELS, OPTION_FIELD_TYPES,
  OPERATOR_LABELS, ACTION_LABELS, evaluateFieldVisibility,
} from '@/lib/recruitment/form-types';

// ── Helper ──────────────────────────────────────────────────────────────
function genId() { return `new_${Date.now()}_${Math.random().toString(36).slice(2)}`; }

const CHIP_BTN = 'min-h-[38px] px-3 py-1.5 rounded-lg text-xs border-2 transition-all font-medium';

// ══════════════════════════════════════════════════════════════════════════
// Field Editor Panel
// ══════════════════════════════════════════════════════════════════════════
function FieldEditor({
  field,
  allFields,
  onSave,
  onDelete,
  saving,
}: {
  field: FormFieldData;
  allFields: FormFieldData[];
  onSave: (updated: FormFieldData) => Promise<void>;
  onDelete: () => void;
  saving: boolean;
}) {
  const [tab, setTab] = useState<'basic' | 'options' | 'conditions' | 'validation'>('basic');
  const [local, setLocal] = useState<FormFieldData>(() => JSON.parse(JSON.stringify(field)));

  useEffect(() => { setLocal(JSON.parse(JSON.stringify(field))); }, [field.id]);

  const needsOptions = OPTION_FIELD_TYPES.includes(local.type);
  const otherFields = allFields.filter(f => f.id !== field.id);

  function setBasic<K extends keyof FormFieldData>(k: K, v: FormFieldData[K]) {
    setLocal(prev => ({ ...prev, [k]: v }));
  }

  // ── Options ───────────────────────────────────────────────────
  function addOption() {
    setLocal(prev => ({
      ...prev,
      options: [...prev.options, { id: genId(), fieldId: field.id, label: '', value: '', sortOrder: prev.options.length, isActive: true }],
    }));
  }
  function removeOption(idx: number) {
    setLocal(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== idx) }));
  }
  function updateOption(idx: number, key: 'label' | 'value', val: string) {
    setLocal(prev => ({
      ...prev,
      options: prev.options.map((o, i) => i === idx ? { ...o, [key]: val } : o),
    }));
  }
  function moveOption(idx: number, dir: -1 | 1) {
    const opts = [...local.options];
    const target = idx + dir;
    if (target < 0 || target >= opts.length) return;
    const tmp = opts[idx];
    const tgt = opts[target];
    if (!tmp || !tgt) return;
    opts[idx] = tgt;
    opts[target] = tmp;
    setLocal(prev => ({ ...prev, options: opts.map((o, i) => ({ ...o, sortOrder: i })) }));
  }

  // ── Conditions ────────────────────────────────────────────────
  function addCondition() {
    const dep = otherFields[0];
    if (!dep) return;
    setLocal(prev => ({
      ...prev,
      conditions: [...prev.conditions, {
        id: genId(), fieldId: field.id,
        dependsOnFieldId: dep.id,
        operator: 'equals', value: '', action: 'show',
      }],
    }));
  }
  function removeCondition(idx: number) {
    setLocal(prev => ({ ...prev, conditions: prev.conditions.filter((_, i) => i !== idx) }));
  }
  function updateCondition<K extends keyof FormFieldConditionData>(idx: number, k: K, v: FormFieldConditionData[K]) {
    setLocal(prev => ({
      ...prev,
      conditions: prev.conditions.map((c, i) => i === idx ? { ...c, [k]: v } : c),
    }));
  }

  // ── Validation ────────────────────────────────────────────────
  const val = local.validation ?? {};
  function setVal(k: string, v: string | number | undefined) {
    setLocal(prev => ({
      ...prev,
      validation: v === '' || v === undefined ? { ...prev.validation, [k]: undefined } : { ...prev.validation, [k]: v },
    }));
  }

  const TABS = [
    { id: 'basic' as const, label: 'پایه' },
    { id: 'options' as const, label: 'گزینه‌ها', hidden: !needsOptions },
    { id: 'conditions' as const, label: 'شرایط' },
    { id: 'validation' as const, label: 'اعتبارسنجی' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100 bg-white sticky top-0 z-10">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-stone-900 truncate">{local.label || 'فیلد جدید'}</p>
          <p className="text-[11px] text-stone-400 font-mono">{local.key}</p>
        </div>
        <div className="flex items-center gap-2">
          {!field.isSystem && (
            <button onClick={onDelete} className="p-1.5 rounded-md text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors">
              <Trash2 size={15} />
            </button>
          )}
          <button
            onClick={() => onSave(local)}
            disabled={saving}
            className="flex items-center gap-1.5 bg-stone-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-stone-700 disabled:opacity-60 transition-colors"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            ذخیره
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-100 bg-stone-50">
        {TABS.filter(t => !t.hidden).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('px-4 py-2.5 text-xs font-medium transition-colors border-b-2',
              tab === t.id
                ? 'border-stone-900 text-stone-900 bg-white'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">

        {/* ── Tab: پایه ─────────────────────────────────────────── */}
        {tab === 'basic' && (
          <>
            <div>
              <label className="text-xs text-stone-500 mb-1.5 block">عنوان فیلد *</label>
              <Input value={local.label} onChange={e => setBasic('label', e.target.value)} placeholder="مثلاً: سابقه کاری" />
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1.5 block">placeholder (متن راهنما)</label>
              <Input value={local.placeholder ?? ''} onChange={e => setBasic('placeholder', e.target.value || null as unknown as string)} placeholder="" />
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1.5 block">متن توضیحی زیر عنوان</label>
              <Input value={local.helpText ?? ''} onChange={e => setBasic('helpText', e.target.value || null as unknown as string)} placeholder="" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-stone-500 mb-1.5 block">نوع فیلد</label>
                <Select value={local.type} onChange={e => setBasic('type', e.target.value as FormFieldType)} disabled={field.isSystem}>
                  {Object.entries(FIELD_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </Select>
                {field.isSystem && <p className="text-[10px] text-stone-400 mt-1">فیلد سیستمی — نوع تغییر نمی‌کند</p>}
              </div>
              <div>
                <label className="text-xs text-stone-500 mb-1.5 block">عرض</label>
                <Select value={local.width} onChange={e => setBasic('width', e.target.value as FormFieldWidth)}>
                  <option value="full">تمام عرض</option>
                  <option value="half">نیم عرض (دو‌ستونه)</option>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs text-stone-500 mb-1.5 block">نمایش بر اساس بخش</label>
              <Select value={local.scope} onChange={e => setBasic('scope', e.target.value as FormFieldScope)}>
                {Object.entries(SCOPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="text-xs text-stone-500 mb-1.5 block">مقدار پیش‌فرض</label>
              <Input value={local.defaultValue ?? ''} onChange={e => setBasic('defaultValue', e.target.value || null as unknown as string)} placeholder="" />
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={local.isRequired} onChange={e => setBasic('isRequired', e.target.checked)} className="w-4 h-4 rounded accent-stone-900" />
                <span className="text-[13px] text-stone-700">اجباری</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={local.isActive} onChange={e => setBasic('isActive', e.target.checked)} className="w-4 h-4 rounded accent-stone-900" />
                <span className="text-[13px] text-stone-700">فعال (نمایش در فرم)</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={local.isFilterable} onChange={e => setBasic('isFilterable', e.target.checked)} className="w-4 h-4 rounded accent-stone-900" />
                <span className="text-[13px] text-stone-700">قابل فیلتر در پنل ادمین</span>
              </label>
            </div>
          </>
        )}

        {/* ── Tab: گزینه‌ها ─────────────────────────────────────── */}
        {tab === 'options' && needsOptions && (
          <>
            <p className="text-xs text-stone-400">گزینه‌های این فیلد را وارد کنید. کلید (value) باید منحصربه‌فرد باشد.</p>
            <div className="space-y-2">
              {local.options.map((opt, idx) => (
                <div key={opt.id} className="flex items-center gap-2 bg-stone-50 rounded-lg p-2">
                  <div className="flex flex-col gap-1">
                    <button onClick={() => moveOption(idx, -1)} disabled={idx === 0} className="text-stone-300 hover:text-stone-600 disabled:opacity-30">
                      <ChevronUp size={14} />
                    </button>
                    <button onClick={() => moveOption(idx, 1)} disabled={idx === local.options.length - 1} className="text-stone-300 hover:text-stone-600 disabled:opacity-30">
                      <ChevronDown size={14} />
                    </button>
                  </div>
                  <Input
                    className="flex-1"
                    value={opt.label}
                    onChange={e => updateOption(idx, 'label', e.target.value)}
                    placeholder="برچسب نمایشی"
                  />
                  <Input
                    className="flex-1 font-mono text-xs"
                    value={opt.value}
                    onChange={e => updateOption(idx, 'value', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    placeholder="کلید (value)"
                    dir="ltr"
                  />
                  <button onClick={() => removeOption(idx)} className="text-stone-300 hover:text-red-500 flex-shrink-0">
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addOption} className="flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 mt-2">
              <Plus size={13} /> افزودن گزینه
            </button>
          </>
        )}

        {/* ── Tab: شرایط ───────────────────────────────────────── */}
        {tab === 'conditions' && (
          <>
            <p className="text-xs text-stone-400 leading-relaxed">
              شرط نمایش یا اجباری‌شدن این فیلد را بر اساس پاسخ به فیلد دیگری تعریف کنید.
            </p>
            {otherFields.length === 0 ? (
              <p className="text-xs text-stone-400 bg-stone-50 rounded-lg p-3">ابتدا فیلدهای دیگری در فرم ایجاد کنید.</p>
            ) : (
              <div className="space-y-3">
                {local.conditions.map((cond, idx) => (
                  <div key={cond.id} className="border border-stone-200 rounded-xl p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-stone-500">شرط {idx + 1}</span>
                      <button onClick={() => removeCondition(idx)} className="text-stone-300 hover:text-red-500">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <div>
                        <label className="text-[10px] text-stone-400 mb-1 block">وقتی فیلد</label>
                        <Select
                          value={cond.dependsOnFieldId}
                          onChange={e => updateCondition(idx, 'dependsOnFieldId', e.target.value)}
                        >
                          {otherFields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                        </Select>
                      </div>
                      <div>
                        <label className="text-[10px] text-stone-400 mb-1 block">عملگر</label>
                        <Select
                          value={cond.operator}
                          onChange={e => updateCondition(idx, 'operator', e.target.value as ConditionOperator)}
                        >
                          {Object.entries(OPERATOR_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </Select>
                      </div>
                      {(cond.operator === 'equals' || cond.operator === 'not_equals' || cond.operator === 'includes') && (
                        <div>
                          <label className="text-[10px] text-stone-400 mb-1 block">مقدار</label>
                          <Input
                            value={cond.value ?? ''}
                            onChange={e => updateCondition(idx, 'value', e.target.value)}
                            placeholder="مقدار مورد نظر"
                            dir="ltr"
                          />
                        </div>
                      )}
                      <div>
                        <label className="text-[10px] text-stone-400 mb-1 block">اقدام</label>
                        <Select
                          value={cond.action}
                          onChange={e => updateCondition(idx, 'action', e.target.value as ConditionAction)}
                        >
                          {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={addCondition} className="flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900">
                  <Plus size={13} /> افزودن شرط
                </button>
              </div>
            )}
          </>
        )}

        {/* ── Tab: اعتبارسنجی ──────────────────────────────────── */}
        {tab === 'validation' && (
          <div className="space-y-3">
            <p className="text-xs text-stone-400">قوانین اعتبارسنجی علاوه بر «اجباری» بودن.</p>
            {(local.type === 'text' || local.type === 'textarea' || local.type === 'tel' || local.type === 'email') && (
              <>
                <div>
                  <label className="text-xs text-stone-500 mb-1.5 block">Regex (الگو)</label>
                  <Input value={val.regex ?? ''} onChange={e => setVal('regex', e.target.value)} dir="ltr" placeholder="^09\d{9}$" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-stone-500 mb-1.5 block">حداقل کاراکتر</label>
                    <Input type="number" value={val.minLength ?? ''} onChange={e => setVal('minLength', e.target.value ? +e.target.value : undefined)} dir="ltr" />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 mb-1.5 block">حداکثر کاراکتر</label>
                    <Input type="number" value={val.maxLength ?? ''} onChange={e => setVal('maxLength', e.target.value ? +e.target.value : undefined)} dir="ltr" />
                  </div>
                </div>
              </>
            )}
            {local.type === 'number' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-stone-500 mb-1.5 block">حداقل</label>
                  <Input type="number" value={val.min ?? ''} onChange={e => setVal('min', e.target.value ? +e.target.value : undefined)} dir="ltr" />
                </div>
                <div>
                  <label className="text-xs text-stone-500 mb-1.5 block">حداکثر</label>
                  <Input type="number" value={val.max ?? ''} onChange={e => setVal('max', e.target.value ? +e.target.value : undefined)} dir="ltr" />
                </div>
              </div>
            )}
            {local.type !== 'text' && local.type !== 'textarea' && local.type !== 'tel' && local.type !== 'email' && local.type !== 'number' && (
              <p className="text-xs text-stone-400 bg-stone-50 rounded-lg p-3">برای این نوع فیلد اعتبارسنجی عددی/متنی اعمال نمی‌شود.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Live Preview Panel
// ══════════════════════════════════════════════════════════════════════════
function LivePreview({ structure }: { structure: FormStructure }) {
  const [previewViewport, setPreviewViewport] = useState<'mobile' | 'desktop'>('mobile');
  const [previewVals, setPreviewVals] = useState<Record<string, unknown>>({});
  const personalSection = structure.sections.find(s => s.key === 'personal_info');

  function getVisibleFields() {
    if (!personalSection) return [];
    return personalSection.fields.filter(f => {
      if (!f.isActive) return false;
      const valsByFieldId: Record<string, unknown> = {};
      for (const af of personalSection.fields) valsByFieldId[af.id] = previewVals[af.key];
      return evaluateFieldVisibility(f, valsByFieldId).visible;
    });
  }

  const INP_P = 'w-full h-9 border border-gray-200 rounded-lg px-3 text-xs bg-white';
  const LBL_P = 'block text-[10px] font-medium text-gray-500 mb-1';

  function renderPreviewField(field: FormFieldData) {
    const val = previewVals[field.key];
    const strVal = Array.isArray(val) ? '' : String(val ?? '');
    const arrVal = Array.isArray(val) ? (val as string[]) : [];
    const activeOpts = field.options.filter(o => o.isActive);

    return (
      <div key={field.id} className={field.width === 'half' ? '' : 'col-span-2'}>
        <label className={LBL_P}>
          {field.label} {field.isRequired && <span className="text-red-400">*</span>}
        </label>
        {field.type === 'select' && (
          <select value={strVal} onChange={e => setPreviewVals(p => ({ ...p, [field.key]: e.target.value }))} className={cn(INP_P, 'appearance-none')}>
            <option value="">انتخاب...</option>
            {activeOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
        {(field.type === 'multiselect' || field.type === 'radio') && (
          <div className="flex flex-wrap gap-1.5">
            {activeOpts.map(o => {
              const active = field.type === 'radio' ? strVal === o.value : arrVal.includes(o.value);
              return (
                <button key={o.value} type="button"
                  onClick={() => {
                    if (field.type === 'radio') setPreviewVals(p => ({ ...p, [field.key]: o.value }));
                    else setPreviewVals(p => ({
                      ...p,
                      [field.key]: arrVal.includes(o.value) ? arrVal.filter(x => x !== o.value) : [...arrVal, o.value],
                    }));
                  }}
                  className={cn('px-2.5 py-1 rounded-lg text-[10px] border transition-all',
                    active ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600')}>
                  {o.label}
                </button>
              );
            })}
          </div>
        )}
        {field.type === 'textarea' && (
          <textarea rows={2} value={strVal} onChange={e => setPreviewVals(p => ({ ...p, [field.key]: e.target.value }))} className="w-full border border-gray-200 rounded-lg p-2 text-xs resize-none" />
        )}
        {!['select','multiselect','radio','textarea','checkbox'].includes(field.type) && (
          <input className={INP_P} value={strVal} onChange={e => setPreviewVals(p => ({ ...p, [field.key]: e.target.value }))} placeholder={field.placeholder ?? ''} />
        )}
      </div>
    );
  }

  const visible = getVisibleFields();

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
        <span className="text-xs font-medium text-stone-700">پیش‌نمایش زنده</span>
        <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-0.5">
          <button onClick={() => setPreviewViewport('mobile')}
            className={cn('p-1.5 rounded-md transition-colors', previewViewport === 'mobile' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500')}>
            <Smartphone size={14} />
          </button>
          <button onClick={() => setPreviewViewport('desktop')}
            className={cn('p-1.5 rounded-md transition-colors', previewViewport === 'desktop' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500')}>
            <Monitor size={14} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-stone-100 p-4">
        <div className={cn('bg-white rounded-xl shadow-sm overflow-hidden mx-auto', previewViewport === 'mobile' ? 'max-w-[375px]' : 'max-w-full')}>
          <div className="p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">اطلاعات شما</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {visible.map(f => renderPreviewField(f))}
            </div>
            {visible.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">هیچ فیلد فعالی وجود ندارد</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Main Form Builder Page
// ══════════════════════════════════════════════════════════════════════════
export default function FormBuilderPage() {
  const user = useAppStore(s => s.user);
  const showToast = useAppStore(s => s.showToast);

  const [structure, setStructure] = useState<FormStructure | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Drag state
  const dragFieldId  = useRef<string | null>(null);
  const dragOverId   = useRef<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  async function loadStructure() {
    setLoading(true);
    try {
      const r = await fetch('/api/recruitment/form-builder', { cache: 'no-store' });
      if (!r.ok) throw new Error();
      const data: FormStructure = await r.json();
      setStructure(data);
    } catch {
      showToast('خطا در بارگذاری فرم‌ساز', 'danger');
    } finally { setLoading(false); }
  }

  useEffect(() => { loadStructure(); }, []);

  async function handleSeed() {
    setSeeding(true);
    try {
      const r = await fetch('/api/recruitment/form-builder/seed', { method: 'POST' });
      const d = await r.json();
      if (d.seeded) showToast('فرم با داده اولیه پر شد', 'success');
      else showToast(d.message ?? 'قبلاً seed شده', 'success');
      await loadStructure();
    } catch { showToast('خطا در seed', 'danger'); }
    finally { setSeeding(false); }
  }

  // همه فیلدها برای condition picker
  const allFields: FormFieldData[] = structure?.sections.flatMap(s => s.fields) ?? [];
  const selectedField = allFields.find(f => f.id === selectedFieldId) ?? null;

  async function handleSaveField(updated: FormFieldData) {
    setSaving(true);
    try {
      const isNew = updated.id.startsWith('new_');
      if (isNew) {
        const r = await fetch('/api/recruitment/form-builder/fields', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sectionId: updated.sectionId,
            key: updated.key,
            label: updated.label,
            type: updated.type,
            isRequired: updated.isRequired,
            scope: updated.scope,
            width: updated.width,
          }),
        });
        if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
        const { field: created } = await r.json();
        // ذخیره options/conditions
        await fetch(`/api/recruitment/form-builder/fields/${created.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: updated.label,
            placeholder: updated.placeholder,
            helpText: updated.helpText,
            isRequired: updated.isRequired,
            isActive: updated.isActive,
            isFilterable: updated.isFilterable,
            scope: updated.scope,
            width: updated.width,
            defaultValue: updated.defaultValue,
            validation: updated.validation,
            options: updated.options,
            conditions: updated.conditions,
          }),
        });
        setSelectedFieldId(created.id);
      } else {
        const r = await fetch(`/api/recruitment/form-builder/fields/${updated.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: updated.label,
            placeholder: updated.placeholder,
            helpText: updated.helpText,
            type: updated.type,
            isRequired: updated.isRequired,
            isActive: updated.isActive,
            isFilterable: updated.isFilterable,
            scope: updated.scope,
            width: updated.width,
            defaultValue: updated.defaultValue,
            validation: updated.validation,
            options: updated.options,
            conditions: updated.conditions,
          }),
        });
        if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
      }
      showToast('فیلد ذخیره شد', 'success');
      await loadStructure();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'خطا در ذخیره فیلد', 'danger');
    } finally { setSaving(false); }
  }

  async function handleDeleteField(id: string) {
    if (!confirm('این فیلد غیرفعال می‌شود. ادامه می‌دهید؟')) return;
    try {
      await fetch(`/api/recruitment/form-builder/fields/${id}`, { method: 'DELETE' });
      showToast('فیلد غیرفعال شد', 'success');
      if (selectedFieldId === id) setSelectedFieldId(null);
      await loadStructure();
    } catch { showToast('خطا', 'danger'); }
  }

  function handleAddField(sectionId: string) {
    const tempId = genId();
    const newField: FormFieldData = {
      id: tempId, sectionId,
      key: `field_${Date.now()}`,
      label: 'فیلد جدید',
      placeholder: null, helpText: null,
      type: 'text', isRequired: false, isActive: true,
      isSystem: false, isFilterable: false,
      sortOrder: 999, scope: 'all', validation: null,
      defaultValue: null, width: 'full',
      options: [], conditions: [],
    };
    setStructure(prev => prev ? {
      ...prev,
      sections: prev.sections.map(s => s.id === sectionId ? { ...s, fields: [...s.fields, newField] } : s),
    } : prev);
    setSelectedFieldId(tempId);
  }

  // ── Drag-to-reorder ─────────────────────────────────────────────
  function onDragStart(fieldId: string) {
    dragFieldId.current = fieldId;
    setDragActive(true);
  }
  function onDragOver(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    dragOverId.current = targetId;
  }
  async function onDrop(sectionId: string) {
    setDragActive(false);
    if (!dragFieldId.current || !structure) return;
    const sec = structure.sections.find(s => s.id === sectionId);
    if (!sec) return;

    const fromField = allFields.find(f => f.id === dragFieldId.current);
    if (!fromField) return;

    // ساخت ترتیب جدید
    const fields = [...sec.fields];
    const fromIdx = fields.findIndex(f => f.id === dragFieldId.current);
    const toIdx   = fields.findIndex(f => f.id === dragOverId.current);
    if (fromIdx === -1) {
      // جابه‌جایی بین مراحل
      const items = fields.map((f, i) => ({ id: f.id, sortOrder: i, sectionId: sec.id }));
      items.push({ id: dragFieldId.current, sortOrder: toIdx >= 0 ? toIdx : fields.length, sectionId: sec.id });
      await fetch('/api/recruitment/form-builder/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
    } else if (toIdx >= 0 && fromIdx !== toIdx) {
      const moved = fields.splice(fromIdx, 1)[0];
      if (!moved) { dragFieldId.current = null; dragOverId.current = null; return; }
      fields.splice(toIdx, 0, moved);
      const items = fields.map((f, i) => ({ id: f.id, sortOrder: i, sectionId: sec.id }));
      await fetch('/api/recruitment/form-builder/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
    }

    dragFieldId.current = null;
    dragOverId.current  = null;
    await loadStructure();
  }

  // ── Guards ──────────────────────────────────────────────────────
  if (!user) return null;
  if (user.role !== 'SuperAdmin') {
    return <div className="p-6"><Empty icon={Settings2} title="دسترسی ندارید" sub="این بخش فقط برای مدیر کل است." /></div>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-stone-400" size={28} />
      </div>
    );
  }

  if (!structure || structure.sections.length === 0) {
    return (
      <div className="p-6 max-w-lg mx-auto mt-10 text-center space-y-4">
        <AlertTriangle size={36} className="text-amber-400 mx-auto" />
        <h2 className="text-lg font-semibold text-stone-800">فرم‌ساز هنوز راه‌اندازی نشده</h2>
        <p className="text-sm text-stone-500">برای شروع، داده اولیه را بارگذاری کنید.</p>
        <Button variant="primary" onClick={handleSeed} loading={seeding} icon={RefreshCw}>
          بارگذاری داده اولیه فرم
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden" dir="rtl">

      {/* ── ستون راست: درخت فیلدها ──────────────────────────────── */}
      <div className="w-72 flex-shrink-0 border-l border-stone-200 flex flex-col bg-white">
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
          <h2 className="text-[13px] font-semibold text-stone-800">مراحل و فیلدها</h2>
          <button
            onClick={() => setShowPreview(p => !p)}
            className={cn('p-1.5 rounded-md transition-colors', showPreview ? 'bg-stone-900 text-white' : 'text-stone-400 hover:text-stone-700')}
            title="پیش‌نمایش"
          >
            {showPreview ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {structure.sections.map(section => (
            <div key={section.id} className="border border-stone-100 rounded-xl overflow-hidden">
              {/* Section header */}
              <div className="flex items-center gap-2 px-3 py-2.5 bg-stone-50">
                <span className="text-[12px] font-semibold text-stone-700 flex-1">{section.title}</span>
                {section.isSystem && <span className="text-[9px] bg-stone-200 text-stone-500 rounded px-1.5 py-0.5">سیستمی</span>}
              </div>

              {/* Fields */}
              <div
                onDragOver={e => { e.preventDefault(); }}
                onDrop={() => onDrop(section.id)}
                className="min-h-[8px]"
              >
                {section.fields.map(field => (
                  <div
                    key={field.id}
                    draggable
                    onDragStart={() => onDragStart(field.id)}
                    onDragOver={e => onDragOver(e, field.id)}
                    onClick={() => setSelectedFieldId(field.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 cursor-pointer text-sm transition-colors border-b border-stone-50 last:border-0',
                      selectedFieldId === field.id ? 'bg-stone-900 text-white' : 'hover:bg-stone-50 text-stone-700',
                      !field.isActive && 'opacity-40',
                    )}
                  >
                    <GripVertical size={14} className="flex-shrink-0 cursor-grab opacity-30" />
                    <span className="flex-1 truncate text-[12.5px]">{field.label}</span>
                    <span className={cn(
                      'text-[9px] rounded px-1 py-0.5 flex-shrink-0',
                      selectedFieldId === field.id ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-400'
                    )}>
                      {field.type}
                    </span>
                    {field.isSystem && (
                      <span className={cn('text-[9px]', selectedFieldId === field.id ? 'text-white/50' : 'text-stone-300')}>
                        sys
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Add field button */}
              <button
                onClick={() => handleAddField(section.id)}
                className="flex items-center gap-1.5 w-full px-3 py-2 text-xs text-stone-400 hover:text-stone-700 hover:bg-stone-50 transition-colors"
              >
                <Plus size={13} /> افزودن فیلد به این مرحله
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── ستون چپ: ویرایشگر یا پیش‌نمایش ─────────────────────── */}
      <div className="flex-1 overflow-hidden flex">
        {/* Editor */}
        <div className={cn('flex-1 overflow-hidden border-l border-stone-200', showPreview && 'w-1/2 flex-none')}>
          {selectedField ? (
            <FieldEditor
              key={selectedField.id}
              field={selectedField}
              allFields={allFields}
              onSave={handleSaveField}
              onDelete={() => handleDeleteField(selectedField.id)}
              saving={saving}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 text-stone-400">
              <Settings2 size={36} strokeWidth={1} className="mb-3" />
              <p className="text-sm">یک فیلد از ستون راست انتخاب کنید یا فیلد جدید اضافه کنید</p>
            </div>
          )}
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="w-1/2 flex-none border-r border-stone-100 overflow-hidden">
            <LivePreview structure={structure} />
          </div>
        )}
      </div>
    </div>
  );
}
