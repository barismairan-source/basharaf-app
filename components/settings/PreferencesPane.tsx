'use client';

import { useRef, useState } from 'react';
import { Card, CardBody, CardHeader, Switch, Select, ACCENT_PRESETS } from '@/components/ui';
import { useAppStore } from '@/store';
import type { Preferences } from '@/types';

/**
 * PreferencesPane — تنظیمات سامانه.
 *
 * تمام preferences از Zustand persist می‌آیند و در localStorage ذخیره می‌شوند.
 * تغییرات بلافاصله اعمال می‌شوند (autosave).
 *
 * گزینه‌ها:
 * - حالت تاریک (موقت — در فاز ۹ به theme provider متصل می‌شود)
 * - حالت فشرده (نمایش متراکم‌تر جدول‌ها)
 * - زبان (فعلاً فقط فارسی)
 * - واحد ارز (تومان / ریال)
 * - تقویم (شمسی / گریگوری)
 * - اعلان‌های pending
 * - گزارش هفتگی ایمیل
 */

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: ToggleRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5 border-b border-stone-100 last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-stone-800">{label}</div>
        <div className="text-[11.5px] text-stone-500 mt-0.5 leading-6">
          {description}
        </div>
      </div>
      <div className="flex-shrink-0 pt-1">
        <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
      </div>
    </div>
  );
}

interface SelectRowProps<T extends string> {
  label: string;
  description: string;
  value: T;
  onChange: (v: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  disabled?: boolean;
}

function SelectRow<T extends string>({
  label,
  description,
  value,
  onChange,
  options,
  disabled,
}: SelectRowProps<T>) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5 border-b border-stone-100 last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-stone-800">{label}</div>
        <div className="text-[11.5px] text-stone-500 mt-0.5 leading-6">
          {description}
        </div>
      </div>
      <div className="flex-shrink-0 min-w-[140px]">
        <Select
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          disabled={disabled}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

export function PreferencesPane() {
  const preferences = useAppStore((s) => s.preferences);
  const updatePreference = useAppStore((s) => s.updatePreference);
  const showToast = useAppStore((s) => s.showToast);
  const colorInputRef = useRef<HTMLInputElement>(null);

  // hex text field state — accentColor ممکن است در store قدیمی وجود نداشته باشد
  const rawAccent = (typeof preferences.accentColor === 'string' && preferences.accentColor)
    ? preferences.accentColor
    : '#2563eb';
  const currentHex = rawAccent.startsWith('#') ? rawAccent : '#2563eb';
  const [hexDraft, setHexDraft] = useState(currentHex);

  function set<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    updatePreference(key, value);
  }

  function notifyChange(label: string) {
    showToast('تنظیم ذخیره شد', 'success', label);
  }

  function applyHex(hex: string) {
    const clean = hex.startsWith('#') ? hex : `#${hex}`;
    if (!/^#[0-9a-fA-F]{6}$/.test(clean)) return;
    setHexDraft(clean);
    set('accentColor', clean);
    notifyChange('رنگ جانبی');
  }

  return (
    <div className="space-y-6">
      {/* ─── Accent Color ─── */}
      <Card>
        <CardHeader title="رنگ جانبی" />
        <CardBody>
          <p className="text-[11.5px] text-stone-500 mb-5 leading-6">
            رنگ دکمه‌ها، لینک‌های فعال، و آیتم انتخاب‌شده در منوی کناری را تغییر می‌دهد.
          </p>

          {/* ── Presets ── */}
          <div className="flex flex-wrap gap-2 mb-5">
            {ACCENT_PRESETS.map((preset) => {
              const isActive = currentHex.toLowerCase() === preset.hex.toLowerCase();
              return (
                <button
                  key={preset.hex}
                  title={preset.label}
                  onClick={() => {
                    setHexDraft(preset.hex);
                    applyHex(preset.hex);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[12px] transition-all ${
                    isActive
                      ? 'border-stone-400 bg-stone-50 font-medium text-stone-800 ring-2 ring-stone-300 ring-offset-1'
                      : 'border-stone-200 hover:border-stone-300 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-black/10"
                    style={{ backgroundColor: preset.hex }}
                  />
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* ── Custom picker ── */}
          <div className="border-t border-stone-100 pt-4">
            <p className="text-[11.5px] text-stone-500 mb-3">یا رنگ دلخواه:</p>
            <div className="flex items-center gap-3">
              {/* native color wheel */}
              <button
                onClick={() => colorInputRef.current?.click()}
                className="w-10 h-10 rounded-lg border-2 border-stone-300 hover:border-stone-400 shadow-sm overflow-hidden flex-shrink-0 transition-colors"
                style={{ backgroundColor: currentHex }}
                title="باز کردن انتخاب‌گر رنگ"
              />
              <input
                ref={colorInputRef}
                type="color"
                value={currentHex}
                onChange={(e) => {
                  setHexDraft(e.target.value);
                  applyHex(e.target.value);
                }}
                className="sr-only"
              />

              {/* hex text input */}
              <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden hover:border-stone-300 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/30 transition-colors">
                <span className="px-3 py-2 text-[13px] text-stone-400 bg-stone-50 border-l border-stone-200 select-none">#</span>
                <input
                  type="text"
                  maxLength={7}
                  value={hexDraft.replace(/^#/, '')}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
                    setHexDraft(`#${raw}`);
                    if (raw.length === 6) applyHex(`#${raw}`);
                  }}
                  onBlur={() => {
                    if (!/^#[0-9a-fA-F]{6}$/.test(hexDraft)) {
                      setHexDraft(currentHex);
                    }
                  }}
                  className="w-24 px-3 py-2 text-[13px] text-stone-800 font-mono bg-white outline-none"
                  placeholder="000000"
                  dir="ltr"
                />
              </div>

              {/* preview chip */}
              <div
                className="h-9 px-4 rounded-lg text-[12.5px] font-medium text-white flex items-center gap-1.5 flex-shrink-0 select-none"
                style={{ backgroundColor: currentHex }}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                پیش‌نمایش
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ─── Display ─── */}
      <Card>
        <CardHeader title="نمایش" />
        <CardBody className="p-0">
          <div className="px-5">
            <ToggleRow
              label="حالت تاریک"
              description="در فاز ۹ به theme provider کامل متصل می‌شود. فعلاً فقط تنظیم ذخیره می‌گردد."
              checked={preferences.darkMode}
              onChange={(v) => {
                set('darkMode', v);
                notifyChange('حالت تاریک');
              }}
            />
            <ToggleRow
              label="نمای فشرده"
              description="فاصله‌ها در جدول‌ها و کارت‌ها کم‌تر می‌شود — مناسب برای نمایش داده‌های بیشتر در یک نگاه."
              checked={preferences.compact}
              onChange={(v) => {
                set('compact', v);
                notifyChange('نمای فشرده');
              }}
            />
          </div>
        </CardBody>
      </Card>

      {/* ─── Localization ─── */}
      <Card>
        <CardHeader title="منطقه و زبان" />
        <CardBody className="p-0">
          <div className="px-5">
            <SelectRow
              label="زبان"
              description="فعلاً فقط فارسی پشتیبانی می‌شود. پشتیبانی از انگلیسی در آینده."
              value={preferences.language}
              onChange={(v) => {
                set('language', v);
                notifyChange('زبان');
              }}
              options={[
                { value: 'fa' as const, label: 'فارسی' },
                { value: 'en' as const, label: 'English (به‌زودی)' },
              ]}
              disabled
            />
            <SelectRow
              label="واحد ارز"
              description="انتخاب می‌کند که مبالغ به تومان یا ریال نمایش داده شوند."
              value={preferences.currency}
              onChange={(v) => {
                set('currency', v);
                notifyChange('واحد ارز');
              }}
              options={[
                { value: 'toman' as const, label: 'تومان' },
                { value: 'rial' as const, label: 'ریال' },
              ]}
            />
            <SelectRow
              label="تقویم"
              description="تاریخ‌ها در فرم‌ها و گزارش‌ها بر اساس این تقویم نمایش داده می‌شوند."
              value={preferences.calendar}
              onChange={(v) => {
                set('calendar', v);
                notifyChange('تقویم');
              }}
              options={[
                { value: 'jalali' as const, label: 'شمسی' },
                { value: 'gregorian' as const, label: 'میلادی' },
              ]}
            />
          </div>
        </CardBody>
      </Card>

      {/* ─── Notifications ─── */}
      <Card>
        <CardHeader title="اعلان‌ها" />
        <CardBody className="p-0">
          <div className="px-5">
            <ToggleRow
              label="اعلان تراکنش‌های در انتظار"
              description="وقتی تراکنش جدیدی برای تایید ارسال می‌شود، در زنگ اعلان نمایش داده شود."
              checked={preferences.notifyPending}
              onChange={(v) => {
                set('notifyPending', v);
                notifyChange('اعلان pending');
              }}
            />
            <ToggleRow
              label="گزارش هفتگی ایمیل"
              description="هر یکشنبه صبح خلاصه‌ای از تراکنش‌های هفته به ایمیل شما ارسال می‌شود. در فاز ۱۰ فعال می‌گردد."
              checked={preferences.weeklyEmail}
              onChange={(v) => {
                set('weeklyEmail', v);
                notifyChange('گزارش هفتگی');
              }}
            />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
