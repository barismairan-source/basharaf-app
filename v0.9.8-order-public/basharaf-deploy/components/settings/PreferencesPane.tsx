'use client';

import { Card, CardBody, CardHeader, Switch, Select } from '@/components/ui';
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

  function set<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    updatePreference(key, value);
  }

  function notifyChange(label: string) {
    showToast('تنظیم ذخیره شد', 'success', label);
  }

  return (
    <div className="space-y-6">
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
