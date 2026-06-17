'use client';

import { useState } from 'react';
import { Save, Check, RefreshCw } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, Field, Input, Textarea } from '@/components/ui';
import { useAppStore } from '@/store';

const GROUPS = [
  {
    id: 'brand',
    title: 'برند',
    fields: [
      { key: 'brand.name', label: 'نام سامانه', placeholder: 'با شرف' },
      { key: 'brand.tagline', label: 'توضیح کوتاه', placeholder: 'سامانه حسابداری شعب' },
    ],
  },
  {
    id: 'login',
    title: 'صفحه ورود',
    fields: [
      { key: 'login.title', label: 'عنوان اصلی', placeholder: 'حسابداری شعب، ساده و یکجا', multiline: true },
      { key: 'login.subtitle', label: 'زیرعنوان', placeholder: 'مدیریت درآمد و هزینه...', multiline: true },
      { key: 'login.feature1', label: 'ویژگی ۱', placeholder: 'گزارش لحظه‌ای تمام شعب' },
      { key: 'login.feature2', label: 'ویژگی ۲', placeholder: 'کنترل و تایید تراکنش‌ها' },
      { key: 'login.feature3', label: 'ویژگی ۳', placeholder: 'تفکیک دقیق درآمد و هزینه' },
    ],
  },
  {
    id: 'dashboard',
    title: 'داشبورد',
    fields: [
      { key: 'dashboard.title', label: 'عنوان صفحه', placeholder: 'داشبورد' },
      { key: 'dashboard.greeting', label: 'پیام خوش‌آمدگویی', placeholder: 'خوش آمدید' },
    ],
  },
];

export function ContentPane() {
  const appSettings = useAppStore(s => s.appSettings);
  const updateSetting = useAppStore(s => s.updateSetting);
  const loadSettings = useAppStore(s => s._loadAppSettings);
  const showToast = useAppStore(s => s.showToast);

  const [saving, setSaving] = useState<Record<string, 'saving' | 'saved'>>({});
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);

  function getValue(key: string): string {
    return (key in localValues ? localValues[key] : appSettings[key]) ?? '';
  }

  function handleChange(key: string, value: string) {
    setLocalValues(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave(key: string) {
    const value = getValue(key);
    setSaving(prev => ({ ...prev, [key]: 'saving' }));
    const ok = await updateSetting(key, value);
    if (ok) {
      setSaving(prev => ({ ...prev, [key]: 'saved' }));
      // پاک کردن localValue — الان در appSettings است
      setLocalValues(prev => { const n = { ...prev }; delete n[key]; return n; });
      setTimeout(() => setSaving(prev => { const n = { ...prev }; delete n[key]; return n; }), 2000);
    } else {
      setSaving(prev => { const n = { ...prev }; delete n[key]; return n; });
      showToast('خطا در ذخیره', 'danger');
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadSettings();
    setLocalValues({});
    setRefreshing(false);
    showToast('تنظیمات به‌روز شد', 'success');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-[12.5px] text-stone-600">
          متن‌های نمایش داده شده در سامانه را ویرایش کنید. تغییرات بلافاصله اعمال می‌شوند.
        </div>
        <Button variant="default" size="sm" icon={RefreshCw} loading={refreshing} onClick={handleRefresh}>
          به‌روزرسانی
        </Button>
      </div>

      {GROUPS.map(group => (
        <Card key={group.id}>
          <CardHeader title={group.title} />
          <CardBody className="space-y-5">
            {group.fields.map(field => {
              const state = saving[field.key];
              const value = getValue(field.key);
              const isDirty = (field.key in localValues) && value !== (appSettings[field.key] ?? '');

              return (
                <div key={field.key}>
                  <Field label={field.label}>
                    <div className="flex items-start gap-2">
                      {field.multiline ? (
                        <Textarea
                          rows={2}
                          placeholder={field.placeholder}
                          value={value}
                          onChange={e => handleChange(field.key, e.target.value)}
                          className="flex-1"
                        />
                      ) : (
                        <Input
                          placeholder={field.placeholder}
                          value={value}
                          onChange={e => handleChange(field.key, e.target.value)}
                          className="flex-1"
                        />
                      )}
                      <Button
                        type="button"
                        variant={state === 'saved' ? 'success' : 'default'}
                        size="sm"
                        icon={state === 'saved' ? Check : Save}
                        loading={state === 'saving'}
                        disabled={!isDirty && state !== 'saved'}
                        onClick={() => handleSave(field.key)}
                        className="flex-shrink-0 mt-0.5"
                      >
                        {state === 'saved' ? 'ذخیره شد' : 'ذخیره'}
                      </Button>
                    </div>
                  </Field>
                </div>
              );
            })}
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
