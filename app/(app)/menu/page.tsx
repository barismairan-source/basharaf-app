'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { UtensilsCrossed, Plus, Trash2, Edit3, X, Check, Eye, EyeOff, ExternalLink, QrCode } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, Field, Input, Select, Textarea, Empty, Chip, Switch } from '@/components/ui';
import { useAppStore } from '@/store';
import { fmt, cn, formatNumericInputValue } from '@/lib/utils';
import { FA_FONTS } from '@/lib/menu/fonts';
import type { MenuItem, MenuSettings } from '@/types';

type Tab = 'items' | 'categories' | 'settings' | 'qr';

export default function MenuAdminPage() {
  const user = useAppStore(s => s.user);
  const sections = useAppStore(s => s.menuSections);
  const settings = useAppStore(s => s.menuSettings);
  const loadMenu = useAppStore(s => s.loadMenu);
  const createItem = useAppStore(s => s.createMenuItem);
  const updateItem = useAppStore(s => s.updateMenuItem);
  const deleteItem = useAppStore(s => s.deleteMenuItem);
  const createCategory = useAppStore(s => s.createMenuCategory);
  const updateCategory = useAppStore(s => s.updateMenuCategory);
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
          {([['items', 'آیتم‌ها'], ['categories', 'دسته‌ها'], ['settings', 'تنظیمات'], ['qr', 'کد QR']] as [Tab, string][]).map(([t, label]) => (
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
          <CategoriesTab sections={sections} onCreate={createCategory} onUpdate={updateCategory} onDelete={deleteCategory} showToast={showToast} />
        )}
        {tab === 'settings' && settings && (
          <SettingsTab settings={settings} onUpdate={updateSettings} showToast={showToast} />
        )}
        {tab === 'qr' && <QrTab settings={settings} showToast={showToast} />}
      </div>
    </div>
  );
}

// ─── Items Tab ───────────────────────────────────────────────────
interface ItemFormState {
  categoryId: string;
  titleFa: string;
  titleEn: string;
  descriptionFa: string;
  descriptionEn: string;
  price: string;
  priceTakeaway: string;
  inHall: boolean;
  inTakeaway: boolean;
}

const EMPTY_ITEM_FORM: ItemFormState = {
  categoryId: '', titleFa: '', titleEn: '', descriptionFa: '', descriptionEn: '',
  price: '', priceTakeaway: '', inHall: true, inTakeaway: false,
};

function itemToForm(item: MenuItem): ItemFormState {
  return {
    categoryId: item.categoryId,
    titleFa: item.titleFa,
    titleEn: item.titleEn,
    descriptionFa: item.descriptionFa,
    descriptionEn: item.descriptionEn,
    price: item.price === null ? '' : item.price.toLocaleString('en-US'),
    priceTakeaway: item.priceTakeaway === null ? '' : item.priceTakeaway.toLocaleString('en-US'),
    inHall: item.inHall,
    inTakeaway: item.inTakeaway,
  };
}

function parsePriceInput(value: string): number | null {
  const digits = value.replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : null;
}

function ItemFormFields({ form, setForm, sections }: {
  form: ItemFormState;
  setForm: React.Dispatch<React.SetStateAction<ItemFormState>>;
  sections: any;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="دسته">
        <Select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
          <option value="">— انتخاب دسته —</option>
          {sections.map((s: any) => <option key={s.id} value={s.id}>{s.labelFa}</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center justify-between rounded-md border border-stone-200 px-3 h-10">
          <span className="text-[12px] text-stone-600">نمایش در سالن</span>
          <Switch checked={form.inHall} onCheckedChange={v => setForm({ ...form, inHall: v })} aria-label="نمایش در سالن" />
        </div>
        <div className="flex items-center justify-between rounded-md border border-stone-200 px-3 h-10">
          <span className="text-[12px] text-stone-600">نمایش در بیرون‌بر</span>
          <Switch checked={form.inTakeaway} onCheckedChange={v => setForm({ ...form, inTakeaway: v })} aria-label="نمایش در بیرون‌بر" />
        </div>
      </div>
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
      <Field label="قیمت سالن (تومان)" hint="خالی = بدون قیمت">
        <Input type="text" inputMode="numeric" dir="ltr" value={form.price}
          onChange={e => setForm({ ...form, price: formatNumericInputValue(e.target) })} />
      </Field>
      <Field label="قیمت بیرون‌بر (تومان)" hint="خالی = همون قیمت سالن">
        <Input type="text" inputMode="numeric" dir="ltr" value={form.priceTakeaway}
          onChange={e => setForm({ ...form, priceTakeaway: formatNumericInputValue(e.target) })} />
      </Field>
    </div>
  );
}

function ItemsTab({ sections, allItems, onCreate, onUpdate, onDelete, showToast }: any) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ItemFormState>(EMPTY_ITEM_FORM);

  async function handleAdd() {
    if (!form.categoryId || !form.titleFa.trim()) { showToast('دسته و عنوان فارسی الزامی است', 'danger'); return; }
    const ok = await onCreate({
      categoryId: form.categoryId, titleFa: form.titleFa.trim(), titleEn: form.titleEn.trim() || form.titleFa.trim(),
      descriptionFa: form.descriptionFa.trim(), descriptionEn: form.descriptionEn.trim(),
      price: parsePriceInput(form.price), priceTakeaway: parsePriceInput(form.priceTakeaway),
      inHall: form.inHall, inTakeaway: form.inTakeaway,
      isAvailable: true, sortOrder: 0,
    });
    if (ok) { showToast('آیتم اضافه شد', 'success'); setShowForm(false); setForm(EMPTY_ITEM_FORM); }
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
            <ItemFormFields form={form} setForm={setForm} sections={sections} />
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
                  <ItemRow key={item.id} item={item} sections={sections} onUpdate={onUpdate} onDelete={onDelete} showToast={showToast} />
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function ItemRow({ item, sections, onUpdate, onDelete, showToast }: {
  item: MenuItem & { sectionLabel: string };
  sections: any;
  onUpdate: any; onDelete: any; showToast: any;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ItemFormState>(() => itemToForm(item));
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setForm(itemToForm(item));
    setEditing(true);
  }

  async function handleSave() {
    if (!form.categoryId || !form.titleFa.trim()) { showToast('دسته و عنوان فارسی الزامی است', 'danger'); return; }
    setSaving(true);
    const ok = await onUpdate(item.id, {
      categoryId: form.categoryId, titleFa: form.titleFa.trim(), titleEn: form.titleEn.trim() || form.titleFa.trim(),
      descriptionFa: form.descriptionFa.trim(), descriptionEn: form.descriptionEn.trim(),
      price: parsePriceInput(form.price), priceTakeaway: parsePriceInput(form.priceTakeaway),
      inHall: form.inHall, inTakeaway: form.inTakeaway,
    });
    setSaving(false);
    if (ok) { showToast('ذخیره شد', 'success'); setEditing(false); }
    else showToast('خطا', 'danger');
  }

  if (editing) {
    return (
      <tr className="border-b border-stone-50 last:border-b-0">
        <td colSpan={5} className="p-4 bg-stone-50/50">
          <ItemFormFields form={form} setForm={setForm} sections={sections} />
          <div className="flex gap-2 justify-end mt-3">
            <Button variant="default" size="sm" icon={X} onClick={() => setEditing(false)}>لغو</Button>
            <Button variant="primary" size="sm" icon={Check} loading={saving} onClick={handleSave}>ذخیره</Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className={cn('border-b border-stone-50 last:border-b-0', !item.isAvailable && 'opacity-50')}>
      <td className="px-5 py-3">
        <div className="text-[12.5px] text-stone-800">{item.titleFa}</div>
        <div className="text-[10.5px] text-muted" dir="ltr">{item.titleEn}</div>
        <div className="flex gap-1 mt-1">
          <Chip tone={item.inHall ? 'green' : 'neutral'}>سالن</Chip>
          <Chip tone={item.inTakeaway ? 'green' : 'neutral'}>بیرون</Chip>
        </div>
      </td>
      <td className="px-3 py-3 text-center"><span className="text-[11px] text-stone-500">{item.sectionLabel}</span></td>
      <td className="px-3 py-3 text-end"><span className="text-[12px] text-stone-700 tabular-nums">{item.price === null ? '—' : fmt(item.price)}</span></td>
      <td className="px-2 py-3 text-center">
        <button onClick={async () => { await onUpdate(item.id, { isAvailable: !item.isAvailable }); }}
          className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-stone-100">
          {item.isAvailable ? <Eye size={14} className="text-emerald-600" /> : <EyeOff size={14} className="text-muted" />}
        </button>
      </td>
      <td className="px-3 py-3 text-center">
        <div className="flex items-center justify-center gap-1">
          <button onClick={startEdit}
            className="w-7 h-7 inline-flex items-center justify-center rounded hover:bg-stone-100 text-muted hover:text-stone-700">
            <Edit3 size={13} strokeWidth={1.5} />
          </button>
          <button onClick={async () => {
            if (!confirm('این آیتم از منو حذف شود؟\n\nاگر می‌خواهید موقتاً پنهان کنید، از دکمه‌ی چشم (غیرفعال‌سازی) استفاده کنید.')) return;
            if (await onDelete(item.id)) showToast('حذف شد', 'success');
          }}
            className="w-7 h-7 inline-flex items-center justify-center rounded hover:bg-rose-50 text-muted hover:text-rose-600">
            <Trash2 size={13} strokeWidth={1.5} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── CategoryRow (ویرایش inline دسته) ──────────────────────────
function CategoryRow({ s, onUpdate, onDelete, showToast }: any) {
  const [editing, setEditing] = useState(false);
  const [labelFa, setLabelFa] = useState(s.labelFa);
  const [labelEn, setLabelEn] = useState(s.labelEn);
  const [sortOrder, setSortOrder] = useState(String(s.sortOrder ?? 0));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!labelFa.trim()) { showToast('نام فارسی الزامی است', 'danger'); return; }
    setSaving(true);
    const ok = await onUpdate(s.id, { labelFa: labelFa.trim(), labelEn: labelEn.trim() || labelFa.trim(), sortOrder: parseInt(sortOrder || '0', 10) });
    setSaving(false);
    if (ok) { showToast('ذخیره شد', 'success'); setEditing(false); }
    else showToast('خطا', 'danger');
  }

  if (editing) {
    return (
      <tr className="border-b border-stone-50 last:border-b-0 bg-stone-50/50">
        <td colSpan={4} className="px-5 py-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Field label="نام فارسی"><Input value={labelFa} onChange={e => setLabelFa(e.target.value)} /></Field>
            <Field label="نام انگلیسی"><Input dir="ltr" value={labelEn} onChange={e => setLabelEn(e.target.value)} /></Field>
            <Field label="ترتیب"><Input type="text" inputMode="numeric" dir="ltr" value={sortOrder} onChange={e => setSortOrder(e.target.value.replace(/\D/g, ''))} /></Field>
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="default" size="sm" icon={X} onClick={() => { setEditing(false); setLabelFa(s.labelFa); setLabelEn(s.labelEn); setSortOrder(String(s.sortOrder ?? 0)); }}>لغو</Button>
            <Button variant="primary" size="sm" icon={Check} loading={saving} onClick={handleSave}>ذخیره</Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-stone-50 last:border-b-0">
      <td className="px-5 py-3">
        <div className="text-[12.5px] text-stone-800">{s.labelFa}</div>
        <div className="text-[10.5px] text-muted" dir="ltr">{s.slug}</div>
      </td>
      <td className="px-3 py-3 text-center"><span className="text-[12px] text-stone-500 tabular-nums">{s.items.length}</span></td>
      <td className="px-3 py-3 text-center">
        <VatRateCell category={s} onUpdate={onUpdate} showToast={showToast} />
      </td>
      <td className="px-3 py-3 text-center">
        <div className="flex items-center justify-center gap-1">
          <button onClick={() => setEditing(true)}
            className="w-7 h-7 inline-flex items-center justify-center rounded hover:bg-stone-100 text-muted hover:text-stone-700">
            <Edit3 size={13} strokeWidth={1.5} />
          </button>
          <button onClick={async () => {
            if (s.items.length > 0) {
              showToast(`این دسته ${s.items.length} آیتم دارد — اول آیتم‌ها را حذف یا جابه‌جا کنید`, 'danger');
              return;
            }
            if (!confirm(`دسته «${s.labelFa}» حذف شود؟`)) return;
            const r = await onDelete(s.id);
            if (r.ok) showToast('حذف شد', 'success'); else showToast(r.error ?? 'خطا', 'danger');
          }}
            className="w-7 h-7 inline-flex items-center justify-center rounded hover:bg-rose-50 text-muted hover:text-rose-600">
            <Trash2 size={13} strokeWidth={1.5} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Categories Tab ──────────────────────────────────────────────
function CategoriesTab({ sections, onCreate, onUpdate, onDelete, showToast }: any) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ slug: '', labelFa: '', labelEn: '', sortOrder: '', vatRate: '' });

  async function handleAdd() {
    if (!form.slug.trim() || !form.labelFa.trim()) { showToast('slug و نام فارسی الزامی است', 'danger'); return; }
    const ok = await onCreate({
      slug: form.slug.trim(), labelFa: form.labelFa.trim(), labelEn: form.labelEn.trim() || form.labelFa.trim(),
      sortOrder: Number(form.sortOrder) || 0, vatRate: form.vatRate.trim() ? Number(form.vatRate) : null,
    });
    if (ok) { showToast('دسته اضافه شد', 'success'); setShowForm(false); setForm({ slug: '', labelFa: '', labelEn: '', sortOrder: '', vatRate: '' }); }
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
              <Field label="نرخ مالیات ٪ (اختیاری)">
                <Input type="text" inputMode="numeric" dir="ltr" placeholder="۱۰ (پیش‌فرض غذا)" value={form.vatRate}
                  onChange={e => setForm({ ...form, vatRate: e.target.value.replace(/\D/g, '').slice(0, 3) })} />
              </Field>
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
                <th className="text-center text-[11px] text-stone-500 font-normal px-3 py-3">مالیات ٪</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {sections.map((s: any) => (
                <CategoryRow key={s.id} s={s} onUpdate={onUpdate} onDelete={onDelete} showToast={showToast} />
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}

/** ورودی درون‌خطی نرخ مالیات هر دسته — خالی = پیش‌فرض ۱۰٪ (غذا). */
function VatRateCell({ category, onUpdate, showToast }: any) {
  const [value, setValue] = useState(category.vatRate === null || category.vatRate === undefined ? '' : String(category.vatRate));
  const [saving, setSaving] = useState(false);

  async function handleBlur() {
    const current = category.vatRate === null || category.vatRate === undefined ? '' : String(category.vatRate);
    if (value === current) return;
    setSaving(true);
    const vatRate = value.trim() ? Number(value) : null;
    const ok = await onUpdate(category.id, { vatRate });
    setSaving(false);
    if (ok) showToast('ذخیره شد', 'success');
    else { showToast('خطا', 'danger'); setValue(current); }
  }

  return (
    <Input type="text" inputMode="numeric" dir="ltr" placeholder="۱۰" disabled={saving}
      className="w-16 text-center mx-auto"
      value={value}
      onChange={e => setValue(e.target.value.replace(/\D/g, '').slice(0, 3))}
      onBlur={handleBlur}
    />
  );
}

// ─── Settings Tab ────────────────────────────────────────────────
const SLUG_RE = /^[a-z0-9-]+$/;

function SettingsTab({ settings, onUpdate, showToast }: any) {
  const [form, setForm] = useState({
    faFont: settings.faFont, phone: settings.phone, addressFa: settings.addressFa,
    addressEn: settings.addressEn, instagram: settings.instagram,
    showPriceHall: settings.showPriceHall, showPriceTakeaway: settings.showPriceTakeaway,
    takeawaySlug: settings.takeawaySlug,
    hallTitle: settings.hallTitle ?? '', takeawayTitle: settings.takeawayTitle ?? '',
    hallNote: settings.hallNote ?? '', takeawayNote: settings.takeawayNote ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [origin, setOrigin] = useState('');

  useEffect(() => { setOrigin(window.location.origin); }, []);

  async function handleSave() {
    const slug = form.takeawaySlug.trim().toLowerCase();
    if (!SLUG_RE.test(slug)) { setSlugError('فقط حروف کوچک انگلیسی، عدد و خط تیره'); return; }
    setSlugError(null);
    setSaving(true);
    const ok = await onUpdate({
      ...form, takeawaySlug: slug,
      hallTitle: form.hallTitle.trim() || null, takeawayTitle: form.takeawayTitle.trim() || null,
      hallNote: form.hallNote.trim() || null, takeawayNote: form.takeawayNote.trim() || null,
    });
    setSaving(false);
    if (ok) showToast('تنظیمات ذخیره شد', 'success');
    else { setSlugError('این لینک تکراری یا نامعتبر است'); showToast('خطا — شاید لینک بیرون‌بر تکراری است', 'danger'); }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="تنظیمات منو" />
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <Field label="فونت فارسی منو">
              <Select value={form.faFont} onChange={e => setForm({ ...form, faFont: e.target.value })}>
                {FA_FONTS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
              </Select>
            </Field>
            <Field label="تلفن"><Input dir="ltr" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="اینستاگرام (بدون @)"><Input dir="ltr" value={form.instagram} onChange={e => setForm({ ...form, instagram: e.target.value })} /></Field>
            <div className="sm:col-span-2">
              <Field label="آدرس فارسی"><Textarea rows={2} value={form.addressFa} onChange={e => setForm({ ...form, addressFa: e.target.value })} /></Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="آدرس انگلیسی"><Textarea rows={2} dir="ltr" value={form.addressEn} onChange={e => setForm({ ...form, addressEn: e.target.value })} /></Field>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="کانال‌های سالن و بیرون‌بر" sub="نمایش قیمت و عنوان/توضیح هر کانال در منوی عمومی" />
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between rounded-md border border-stone-200 px-3 h-10">
              <span className="text-[12px] text-stone-600">نمایش قیمت در منوی سالن</span>
              <Switch checked={form.showPriceHall} onCheckedChange={v => setForm({ ...form, showPriceHall: v })} aria-label="نمایش قیمت در منوی سالن" />
            </div>
            <div className="flex items-center justify-between rounded-md border border-stone-200 px-3 h-10">
              <span className="text-[12px] text-stone-600">نمایش قیمت در منوی بیرون‌بر</span>
              <Switch checked={form.showPriceTakeaway} onCheckedChange={v => setForm({ ...form, showPriceTakeaway: v })} aria-label="نمایش قیمت در منوی بیرون‌بر" />
            </div>
          </div>

          <Field label="لینک منوی بیرون‌بر" error={slugError ?? undefined} helper={origin ? `پیش‌نمایش: ${origin}/m/${form.takeawaySlug || '...'}` : `پیش‌نمایش: /m/${form.takeawaySlug || '...'}`}>
            <Input dir="ltr" placeholder="birun" value={form.takeawaySlug}
              onChange={e => setForm({ ...form, takeawaySlug: e.target.value.toLowerCase() })} />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="عنوان منوی سالن (اختیاری)"><Input value={form.hallTitle} onChange={e => setForm({ ...form, hallTitle: e.target.value })} /></Field>
            <Field label="عنوان منوی بیرون‌بر (اختیاری)"><Input value={form.takeawayTitle} onChange={e => setForm({ ...form, takeawayTitle: e.target.value })} /></Field>
            <Field label="متن پایین منوی سالن (اختیاری)"><Textarea rows={2} value={form.hallNote} onChange={e => setForm({ ...form, hallNote: e.target.value })} /></Field>
            <Field label="متن پایین منوی بیرون‌بر (اختیاری)"><Textarea rows={2} value={form.takeawayNote} onChange={e => setForm({ ...form, takeawayNote: e.target.value })} /></Field>
          </div>
        </CardBody>
      </Card>

      <div className="flex justify-end items-center gap-3 mt-2 pt-4 border-t border-border">
        <Button variant="primary" icon={Check} loading={saving} onClick={handleSave}>ذخیره تنظیمات</Button>
      </div>
    </div>
  );
}

// ─── QR Tab ──────────────────────────────────────────────────────
function QrTab({ settings, showToast }: { settings: MenuSettings | null; showToast: any }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <QrCard
          title="کد QR — سالن"
          sub="منوی سالن"
          path="/m"
          filename="basharaf-menu-hall-qr.png"
          showToast={showToast}
        />
        <QrCard
          title="کد QR — بیرون‌بر"
          sub="منوی بیرون‌بر"
          path={`/m/${settings?.takeawaySlug || 'birun'}`}
          filename="basharaf-menu-takeaway-qr.png"
          showToast={showToast}
        />
      </div>
      <p className="text-[11px] text-muted leading-6 text-center">
        این کدها به صفحه‌های منوی عمومی وصل‌اند. هر تغییری در منو یا تنظیمات فوری در آن‌ها دیده می‌شود —
        با تغییر «لینک منوی بیرون‌بر» در تب تنظیمات، QR بیرون‌بر هم به‌روز می‌شود.
      </p>
    </div>
  );
}

function QrCard({ title, sub, path, filename, showToast }: {
  title: string; sub: string; path: string; filename: string; showToast: any;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [url, setUrl] = useState('');

  useEffect(() => {
    const fullUrl = `${window.location.origin}${path}`;
    setUrl(fullUrl);
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, fullUrl, {
        width: 220,
        margin: 2,
        color: { dark: '#1c1917', light: '#ffffff' },
      }).catch(() => {});
    }
  }, [path]);

  function handleDownload() {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
    showToast('کد QR دانلود شد', 'success');
  }

  function handleCopyUrl() {
    navigator.clipboard.writeText(url).then(() => showToast('لینک کپی شد', 'success'));
  }

  return (
    <Card>
      <CardHeader title={title} sub={sub} />
      <CardBody className="flex flex-col items-center gap-4 py-6">
        <div className="rounded-xl border border-stone-200 p-3 bg-white">
          <canvas ref={canvasRef} />
        </div>

        <div className="w-full space-y-2.5">
          <div className="flex items-center gap-2 p-2.5 rounded-md bg-stone-50 border border-stone-200">
            <span className="flex-1 text-[11px] text-stone-600 truncate" dir="ltr">{url}</span>
            <button onClick={handleCopyUrl} className="text-[11px] text-stone-500 hover:text-stone-900 px-2 py-1 rounded hover:bg-stone-100">
              کپی
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="primary" size="sm" icon={QrCode} onClick={handleDownload}>دانلود PNG</Button>
            <Button variant="default" size="sm" icon={ExternalLink} onClick={() => window.open(url, '_blank')}>مشاهده</Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
