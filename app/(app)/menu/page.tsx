'use client';

import { useEffect, useMemo, useState } from 'react';
import { UtensilsCrossed, Plus, Trash2, Edit3, X, Check, Eye, EyeOff, ExternalLink, QrCode } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, Field, Input, Select, Textarea, Empty, Chip } from '@/components/ui';
import { useAppStore } from '@/store';
import { fmt, cn } from '@/lib/utils';
import { FA_FONTS } from '@/lib/menu/fonts';
import type { MenuItem } from '@/types';

type Tab = 'items' | 'categories' | 'settings';

export default function MenuAdminPage() {
  const user = useAppStore(s => s.user);
  const sections = useAppStore(s => s.menuSections);
  const settings = useAppStore(s => s.menuSettings);
  const loadMenu = useAppStore(s => s.loadMenu);
  const createItem = useAppStore(s => s.createMenuItem);
  const updateItem = useAppStore(s => s.updateMenuItem);
  const deleteItem = useAppStore(s => s.deleteMenuItem);
  const createCategory = useAppStore(s => s.createMenuCategory);
  const deleteCategory = useAppStore(s => s.deleteMenuCategory);
  const updateSettings = useAppStore(s => s.updateMenuSettings);
  const showToast = useAppStore(s => s.showToast);

  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<Tab>('items');

  useEffect(() => { setHydrated(true); loadMenu(); }, [loadMenu]);

  const allItems = useMemo(
    () => sections.flatMap(s => s.items.map(it => ({ ...it, sectionLabel: s.labelFa }))),
    [sections]
  );

  if (!hydrated || !user) return null;
  if (user.role !== 'SuperAdmin') {
    return <div className="p-6"><Card><CardBody><Empty title="فقط مدیر کل به این بخش دسترسی دارد" icon={UtensilsCrossed} /></CardBody></Card></div>;
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-medium text-stone-900 tracking-tight">مدیریت منو</h1>
            <div className="text-[12px] text-stone-500 mt-1">منوی دیجیتال صفاسیتی</div>
          </div>
          <a href="/m" target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 h-9 px-3 rounded-md border border-stone-200 text-[12px] text-stone-600 hover:bg-stone-50">
            <ExternalLink size={13} strokeWidth={1.5} />
            <span className="hidden sm:inline">مشاهده منو</span>
          </a>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-stone-200">
          {([['items', 'آیتم‌ها'], ['categories', 'دسته‌ها'], ['settings', 'تنظیمات']] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-4 h-10 text-[13px] border-b-2 -mb-px transition-colors',
                tab === t ? 'border-stone-900 text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-800')}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'items' && (
          <ItemsTab sections={sections} allItems={allItems}
            onCreate={createItem} onUpdate={updateItem} onDelete={deleteItem} showToast={showToast} />
        )}
        {tab === 'categories' && (
          <CategoriesTab sections={sections} onCreate={createCategory} onDelete={deleteCategory} showToast={showToast} />
        )}
        {tab === 'settings' && settings && (
          <SettingsTab settings={settings} onUpdate={updateSettings} showToast={showToast} />
        )}
      </div>
    </div>
  );
}

// ─── Items Tab ───────────────────────────────────────────────────
function ItemsTab({ sections, allItems, onCreate, onUpdate, onDelete, showToast }: any) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ categoryId: '', titleFa: '', titleEn: '', descriptionFa: '', descriptionEn: '', price: '' });

  async function handleAdd() {
    if (!form.categoryId || !form.titleFa.trim()) { showToast('دسته و عنوان فارسی الزامی است', 'danger'); return; }
    const ok = await onCreate({
      categoryId: form.categoryId, titleFa: form.titleFa.trim(), titleEn: form.titleEn.trim() || form.titleFa.trim(),
      descriptionFa: form.descriptionFa.trim(), descriptionEn: form.descriptionEn.trim(),
      price: Number(form.price) || 0, isAvailable: true, sortOrder: 0,
    });
    if (ok) { showToast('آیتم اضافه شد', 'success'); setShowForm(false); setForm({ categoryId: '', titleFa: '', titleEn: '', descriptionFa: '', descriptionEn: '', price: '' }); }
    else showToast('خطا', 'danger');
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowForm(!showForm)}>آیتم جدید</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader title="افزودن آیتم" />
          <CardBody className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="دسته">
                <Select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">— انتخاب دسته —</option>
                  {sections.map((s: any) => <option key={s.id} value={s.id}>{s.labelFa}</option>)}
                </Select>
              </Field>
              <Field label="قیمت (تومان)">
                <Input type="text" inputMode="numeric" dir="ltr" value={form.price} onChange={e => setForm({ ...form, price: e.target.value.replace(/\D/g, '') })} />
              </Field>
              <Field label="عنوان فارسی">
                <Input value={form.titleFa} onChange={e => setForm({ ...form, titleFa: e.target.value })} />
              </Field>
              <Field label="عنوان انگلیسی">
                <Input dir="ltr" value={form.titleEn} onChange={e => setForm({ ...form, titleEn: e.target.value })} />
              </Field>
              <Field label="توضیح فارسی">
                <Input value={form.descriptionFa} onChange={e => setForm({ ...form, descriptionFa: e.target.value })} />
              </Field>
              <Field label="توضیح انگلیسی">
                <Input dir="ltr" value={form.descriptionEn} onChange={e => setForm({ ...form, descriptionEn: e.target.value })} />
              </Field>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="default" size="sm" onClick={() => setShowForm(false)}>لغو</Button>
              <Button variant="primary" size="sm" icon={Plus} onClick={handleAdd}>افزودن</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {allItems.length === 0 ? (
        <Card><CardBody><Empty title="آیتمی ثبت نشده" icon={UtensilsCrossed} /></CardBody></Card>
      ) : (
        <Card>
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead className="bg-stone-50/50 border-b border-stone-100">
                <tr>
                  <th className="text-right text-[11px] text-stone-500 font-normal px-5 py-3">عنوان</th>
                  <th className="text-center text-[11px] text-stone-500 font-normal px-3 py-3">دسته</th>
                  <th className="text-end text-[11px] text-stone-500 font-normal px-3 py-3">قیمت</th>
                  <th className="text-center text-[11px] text-stone-500 font-normal px-2 py-3">وضعیت</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody>
                {allItems.map((item: any) => (
                  <ItemRow key={item.id} item={item} onUpdate={onUpdate} onDelete={onDelete} showToast={showToast} />
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function ItemRow({ item, onUpdate, onDelete, showToast }: { item: MenuItem & { sectionLabel: string }; onUpdate: any; onDelete: any; showToast: any }) {
  return (
    <tr className={cn('border-b border-stone-50 last:border-b-0', !item.isAvailable && 'opacity-50')}>
      <td className="px-5 py-3">
        <div className="text-[12.5px] text-stone-800">{item.titleFa}</div>
        <div className="text-[10.5px] text-stone-400" dir="ltr">{item.titleEn}</div>
      </td>
      <td className="px-3 py-3 text-center"><span className="text-[11px] text-stone-500">{item.sectionLabel}</span></td>
      <td className="px-3 py-3 text-end"><span className="text-[12px] text-stone-700 tabular-nums">{fmt(item.price)}</span></td>
      <td className="px-2 py-3 text-center">
        <button onClick={async () => { await onUpdate(item.id, { isAvailable: !item.isAvailable }); }}
          className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-stone-100">
          {item.isAvailable ? <Eye size={14} className="text-emerald-600" /> : <EyeOff size={14} className="text-stone-400" />}
        </button>
      </td>
      <td className="px-3 py-3 text-center">
        <button onClick={async () => { if (await onDelete(item.id)) showToast('حذف شد', 'success'); }}
          className="w-7 h-7 inline-flex items-center justify-center rounded hover:bg-rose-50 text-stone-400 hover:text-rose-600">
          <Trash2 size={13} strokeWidth={1.5} />
        </button>
      </td>
    </tr>
  );
}

// ─── Categories Tab ──────────────────────────────────────────────
function CategoriesTab({ sections, onCreate, onDelete, showToast }: any) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ slug: '', labelFa: '', labelEn: '', sortOrder: '' });

  async function handleAdd() {
    if (!form.slug.trim() || !form.labelFa.trim()) { showToast('slug و نام فارسی الزامی است', 'danger'); return; }
    const ok = await onCreate({ slug: form.slug.trim(), labelFa: form.labelFa.trim(), labelEn: form.labelEn.trim() || form.labelFa.trim(), sortOrder: Number(form.sortOrder) || 0 });
    if (ok) { showToast('دسته اضافه شد', 'success'); setShowForm(false); setForm({ slug: '', labelFa: '', labelEn: '', sortOrder: '' }); }
    else showToast('خطا — شاید slug تکراری است', 'danger');
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowForm(!showForm)}>دسته جدید</Button>
      </div>
      {showForm && (
        <Card>
          <CardHeader title="افزودن دسته" />
          <CardBody className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="نام فارسی"><Input value={form.labelFa} onChange={e => setForm({ ...form, labelFa: e.target.value })} /></Field>
              <Field label="نام انگلیسی"><Input dir="ltr" value={form.labelEn} onChange={e => setForm({ ...form, labelEn: e.target.value })} /></Field>
              <Field label="slug (انگلیسی، یکتا)"><Input dir="ltr" placeholder="drinks" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase() })} /></Field>
              <Field label="ترتیب"><Input type="text" inputMode="numeric" dir="ltr" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: e.target.value.replace(/\D/g, '') })} /></Field>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="default" size="sm" onClick={() => setShowForm(false)}>لغو</Button>
              <Button variant="primary" size="sm" icon={Plus} onClick={handleAdd}>افزودن</Button>
            </div>
          </CardBody>
        </Card>
      )}
      <Card>
        <CardBody className="p-0">
          <table className="w-full">
            <thead className="bg-stone-50/50 border-b border-stone-100">
              <tr>
                <th className="text-right text-[11px] text-stone-500 font-normal px-5 py-3">نام</th>
                <th className="text-center text-[11px] text-stone-500 font-normal px-3 py-3">آیتم‌ها</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {sections.map((s: any) => (
                <tr key={s.id} className="border-b border-stone-50 last:border-b-0">
                  <td className="px-5 py-3">
                    <div className="text-[12.5px] text-stone-800">{s.labelFa}</div>
                    <div className="text-[10.5px] text-stone-400" dir="ltr">{s.slug}</div>
                  </td>
                  <td className="px-3 py-3 text-center"><span className="text-[12px] text-stone-500 tabular-nums">{s.items.length}</span></td>
                  <td className="px-3 py-3 text-center">
                    <button onClick={async () => { const r = await onDelete(s.id); if (r.ok) showToast('حذف شد', 'success'); else showToast(r.error ?? 'خطا', 'danger'); }}
                      className="w-7 h-7 inline-flex items-center justify-center rounded hover:bg-rose-50 text-stone-400 hover:text-rose-600">
                      <Trash2 size={13} strokeWidth={1.5} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}

// ─── Settings Tab ────────────────────────────────────────────────
function SettingsTab({ settings, onUpdate, showToast }: any) {
  const [form, setForm] = useState({
    faFont: settings.faFont, phone: settings.phone, addressFa: settings.addressFa,
    addressEn: settings.addressEn, instagram: settings.instagram,
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const ok = await onUpdate(form);
    setSaving(false);
    showToast(ok ? 'تنظیمات ذخیره شد' : 'خطا', ok ? 'success' : 'danger');
  }

  return (
    <Card>
      <CardHeader title="تنظیمات منو" />
      <CardBody className="space-y-4">
        <Field label="فونت فارسی منو">
          <Select value={form.faFont} onChange={e => setForm({ ...form, faFont: e.target.value })}>
            {FA_FONTS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
          </Select>
        </Field>
        <Field label="تلفن"><Input dir="ltr" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="آدرس فارسی"><Textarea rows={2} value={form.addressFa} onChange={e => setForm({ ...form, addressFa: e.target.value })} /></Field>
        <Field label="آدرس انگلیسی"><Textarea rows={2} dir="ltr" value={form.addressEn} onChange={e => setForm({ ...form, addressEn: e.target.value })} /></Field>
        <Field label="اینستاگرام (بدون @)"><Input dir="ltr" value={form.instagram} onChange={e => setForm({ ...form, instagram: e.target.value })} /></Field>
        <div className="flex justify-end">
          <Button variant="primary" size="sm" icon={Check} loading={saving} onClick={handleSave}>ذخیره</Button>
        </div>
      </CardBody>
    </Card>
  );
}
