'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, Info, ChevronDown, MoreVertical } from 'lucide-react';
import { createRepos } from '@/lib/repos';
import { useAppStore } from '@/store';
import { canDo } from '@/lib/auth/permissions';
import { fmt, toFa } from '@/lib/utils';
import { Button, DataList, EmptyState, Sheet } from '@/components/ui';
import type { DataColumn } from '@/components/ui/DataList';
import type { InventoryItem, NewInventoryItemInput, InvUnit, InvItemKind } from '@/types';

const repos = createRepos(null as never);

// ── ثوابت ──────────────────────────────────────────────────────────

const UNIT_LABELS: Record<InvUnit, string> = {
  kg: 'کیلوگرم', g: 'گرم', L: 'لیتر', ml: 'میلی‌لیتر',
  pcs: 'عدد', can: 'قوطی', pack: 'بسته',
};

const UNIT_BASE: Record<InvUnit, string> = {
  kg: 'گرم', g: 'گرم', L: 'میلی‌لیتر', ml: 'میلی‌لیتر',
  pcs: 'عدد', can: 'عدد', pack: 'عدد',
};

const DEFAULT_BPU: Record<InvUnit, number> = {
  kg: 1000, g: 1, L: 1000, ml: 1, pcs: 1, can: 1, pack: 1,
};

// ── helpers ─────────────────────────────────────────────────────────

function nextCode(items: InventoryItem[]): string {
  let max = 0;
  for (const it of items) {
    const n = parseInt(it.code, 10);
    if (!isNaN(n) && n > max) max = n;
  }
  return String(max + 1).padStart(3, '0');
}

function errMsg(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message && !/^HTTP \d+$/.test(e.message)) return e.message;
  return fallback;
}

// ── form state ──────────────────────────────────────────────────────

interface ItemForm {
  code: string;
  name: string;
  unit: InvUnit;
  branchId: string;
  kind: InvItemKind;
  basePerUnit: string;
  yieldPct: string;
  minBase: string;
}

const EMPTY_FORM: ItemForm = {
  code: '', name: '', unit: 'kg', branchId: '', kind: 'raw',
  basePerUnit: '1000', yieldPct: '100', minBase: '0',
};

// ── sub-components ──────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[12px] text-muted mb-1">
      {children}
      {required && <span className="text-danger mr-0.5">*</span>}
    </label>
  );
}

function TextInput({
  value, onChange, placeholder, className, type = 'text',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full h-11 px-3 text-[13px] border border-border rounded-lg bg-surface focus:outline-none focus:ring-1 focus:ring-accent${className ? ` ${className}` : ''}`}
    />
  );
}

// ── main component ──────────────────────────────────────────────────

export default function InventoryItemsPage() {
  const user = useAppStore((s) => s.user);
  const branches = useAppStore((s) => s.branches);
  const showToast = useAppStore((s) => s.showToast);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<ItemForm>(EMPTY_FORM);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);

  const canSeePrices = canDo(user, 'inventory.viewCosts');
  const isSuperAdmin = user?.role === 'SuperAdmin';

  // ── data loading ──────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const its = await repos.inventory.listItems();
      setItems(its);
    } catch {
      showToast('خطا در بارگذاری اقلام', 'danger');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  // ── form helpers ──────────────────────────────────────────────────

  function openAdd() {
    setEditItem(null);
    setForm({ ...EMPTY_FORM, code: nextCode(items) });
    setShowAdvanced(false);
    setSheetOpen(true);
  }

  function openEdit(item: InventoryItem) {
    setOpenMenuId(null);
    setEditItem(item);
    setForm({
      code: item.code,
      name: item.name,
      unit: item.unit,
      branchId: item.branchId ?? '',
      kind: item.kind,
      basePerUnit: String(item.basePerUnit),
      yieldPct: String(item.yieldPct),
      minBase: String(item.minBase),
    });
    setShowAdvanced(false);
    setSheetOpen(true);
  }

  async function handleDelete(item: InventoryItem) {
    setOpenMenuId(null);
    if (!confirm(`حذف «${item.name}»؟`)) return;
    try {
      await repos.inventory.deleteItem(item.id);
      showToast('قلم حذف شد', 'success');
      await load();
    } catch (e) {
      showToast(errMsg(e, 'خطا در حذف'), 'danger');
    }
  }

  async function handleSave() {
    if (!form.branchId || !form.name.trim()) return;
    setSaving(true);
    try {
      const input: NewInventoryItemInput = {
        code: form.code.trim(),
        name: form.name.trim(),
        branchId: form.branchId,
        kind: form.kind,
        unit: form.unit,
        basePerUnit: parseFloat(form.basePerUnit) || 1,
        yieldPct: parseFloat(form.yieldPct) || 100,
        minBase: parseFloat(form.minBase) || 0,
      };
      if (editItem) {
        await repos.inventory.updateItem(editItem.id, input);
        showToast('قلم به‌روز شد', 'success');
      } else {
        await repos.inventory.createItem(input);
        showToast('قلم افزوده شد', 'success');
      }
      setSheetOpen(false);
      await load();
    } catch (e) {
      showToast(errMsg(e, 'خطا در ذخیره'), 'danger');
    } finally {
      setSaving(false);
    }
  }

  // ── filtering ─────────────────────────────────────────────────────

  const q = search.trim();
  const filtered = q
    ? items.filter((it) => it.name.includes(q) || it.code.includes(q) || it.category.includes(q))
    : items;

  // ── live preview ──────────────────────────────────────────────────

  const bpu = parseFloat(form.basePerUnit);
  const bpuPreview =
    !isNaN(bpu) && bpu > 0
      ? `۱ ${UNIT_LABELS[form.unit]} = ${toFa(bpu)} ${UNIT_BASE[form.unit]}`
      : '';

  // ── unit change ───────────────────────────────────────────────────

  function handleUnitChange(u: InvUnit) {
    setForm((f) => ({ ...f, unit: u, basePerUnit: String(DEFAULT_BPU[u]) }));
  }

  // ── columns ───────────────────────────────────────────────────────

  const columns: DataColumn<InventoryItem>[] = [
    {
      key: 'name',
      label: 'نام قلم',
      render: (row) => (
        <div>
          <div className="text-[13px] font-medium text-text leading-snug">{row.name}</div>
          <div className="text-[11px] text-muted mt-0.5 num">
            {row.code} · {UNIT_LABELS[row.unit]}
          </div>
        </div>
      ),
    },
    {
      key: 'code',
      label: 'کد',
      mobileHide: true,
      render: (row) => <span className="num text-[13px] text-muted">{row.code}</span>,
    },
    {
      key: 'qty',
      label: 'موجودی',
      headerClassName: 'text-left',
      cellClassName: 'text-left',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <span className="num text-[13px]">
            {toFa(row.qtyPhysical)} {UNIT_LABELS[row.unit]}
          </span>
          {row.qtyPhysical === 0 && row.avgCostPerBase > 0 && (
            <span
              title="آخرین میانگین خرید موجود است — قلم صفر شده اما قیمت تاریخچه دارد"
              className="text-muted/60 cursor-help flex-shrink-0"
              aria-label="آخرین میانگین خرید"
            >
              <Info size={13} strokeWidth={1.5} />
            </span>
          )}
        </div>
      ),
    },
    ...(canSeePrices
      ? ([{
          key: 'cost',
          label: 'میانگین بها',
          mobileLabel: 'میانگین بها',
          headerClassName: 'text-left',
          cellClassName: 'text-left',
          render: (row: InventoryItem) => (
            <span className="num text-[13px]">
              {row.avgCostPerBase > 0 ? `${fmt(Math.round(row.avgCostPerBase))} ت` : '—'}
            </span>
          ),
        }] as DataColumn<InventoryItem>[])
      : []),
    ...(isSuperAdmin
      ? ([{
          key: 'actions',
          label: '',
          mobileLabel: '',
          render: (row: InventoryItem) => {
            const isOpen = openMenuId === row.id;
            return (
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(isOpen ? null : row.id);
                  }}
                  aria-label="عملیات"
                  aria-expanded={isOpen}
                  className="w-11 h-11 flex items-center justify-center text-muted hover:text-text hover:bg-bg rounded-lg transition-colors"
                >
                  <MoreVertical size={16} strokeWidth={1.5} />
                </button>
                {isOpen && (
                  <div className="absolute left-0 top-full mt-1 z-50 w-32 bg-surface border border-border rounded-lg shadow-modal py-1">
                    <button
                      type="button"
                      onClick={() => openEdit(row)}
                      className="w-full text-right px-4 py-2.5 text-[13px] text-text hover:bg-bg transition-colors"
                    >
                      ویرایش
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(row)}
                      className="w-full text-right px-4 py-2.5 text-[13px] text-danger hover:bg-danger-subtle transition-colors"
                    >
                      حذف
                    </button>
                  </div>
                )}
              </div>
            );
          },
          cellClassName: 'w-12 p-0',
          headerClassName: 'w-12',
        }] as DataColumn<InventoryItem>[])
      : []),
  ];

  if (!user) return null;

  const canAdd = isSuperAdmin;

  return (
    <>
      {/* invisible overlay to close open ⋮ menu */}
      {openMenuId && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpenMenuId(null)}
          aria-hidden="true"
        />
      )}

      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
        {/* ─── Header ─── */}
        <div className="flex items-center justify-between">
          <h1 className="text-[17px] font-semibold text-text">اقلام انبار</h1>
          {canAdd && (
            <Button size="sm" onClick={openAdd}>+ افزودن قلم</Button>
          )}
        </div>

        {/* ─── Sticky search ─── */}
        <div className="sticky top-14 z-20 -mx-4 md:-mx-6 px-4 md:px-6 py-2.5 bg-bg/95 backdrop-blur border-b border-border">
          <div className="relative max-w-3xl mx-auto">
            <Search
              size={15}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="جستجو در نام، کد، دسته..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pr-9 pl-3 text-[13px] border border-border rounded-lg bg-surface focus:outline-none focus:ring-1 focus:ring-accent"
              aria-label="جستجوی اقلام"
            />
          </div>
        </div>

        {/* ─── List ─── */}
        <DataList<InventoryItem>
          columns={columns}
          data={filtered}
          keyExtractor={(r) => r.id}
          loading={loading}
          empty={
            <EmptyState
              title={q ? 'نتیجه‌ای یافت نشد' : 'هنوز قلمی ندارید'}
              description={
                q
                  ? 'عبارت جستجو را تغییر دهید'
                  : 'برای شروع، اولین قلم انبار را اضافه کنید'
              }
              action={
                canAdd && !q ? (
                  <Button size="sm" onClick={openAdd}>+ افزودن قلم</Button>
                ) : undefined
              }
            />
          }
        />
      </div>

      {/* ─── Add / Edit Sheet ─── */}
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editItem ? `ویرایش: ${editItem.name}` : 'افزودن قلم جدید'}
        maxHeight="90vh"
      >
        <div className="space-y-4 pb-6">

          {/* Row: کد + واحد */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>کد (پیشنهادی)</FieldLabel>
              <TextInput
                value={form.code}
                onChange={(v) => setForm((f) => ({ ...f, code: v }))}
                placeholder="مثلاً ۰۰۱"
              />
            </div>
            <div>
              <FieldLabel>واحد</FieldLabel>
              <select
                value={form.unit}
                onChange={(e) => handleUnitChange(e.target.value as InvUnit)}
                className="w-full h-11 px-3 text-[13px] border border-border rounded-lg bg-surface focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {(Object.entries(UNIT_LABELS) as [InvUnit, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {/* نام */}
          <div>
            <FieldLabel>نام قلم</FieldLabel>
            <TextInput
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="مثلاً قهوه اسپرسو ۱"
            />
          </div>

          {/* شعبه — اجباری */}
          <div>
            <FieldLabel required>شعبه</FieldLabel>
            <select
              value={form.branchId}
              onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
              className="w-full h-11 px-3 text-[13px] border border-border rounded-lg bg-surface focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">انتخاب شعبه...</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            {!form.branchId && (
              <p className="mt-1 text-[11px] text-danger">
                انتخاب شعبه الزامی است
              </p>
            )}
          </div>

          {/* ─── تنظیمات پیشرفته (آکاردئون) ─── */}
          <div className="border border-border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-[13px] text-text hover:bg-bg transition-colors"
              aria-expanded={showAdvanced}
            >
              <span>تنظیمات پیشرفته</span>
              <ChevronDown
                size={15}
                strokeWidth={1.5}
                className={`text-muted transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
              />
            </button>

            {showAdvanced && (
              <div className="px-4 pt-3 pb-4 space-y-3 border-t border-border bg-bg/40">
                {/* ضریب تبدیل */}
                <div>
                  <FieldLabel>ضریب تبدیل به واحد پایه</FieldLabel>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.basePerUnit}
                    onChange={(e) => setForm((f) => ({ ...f, basePerUnit: e.target.value }))}
                    className="w-full h-11 px-3 text-[13px] border border-border rounded-lg bg-surface focus:outline-none focus:ring-1 focus:ring-accent num"
                  />
                  {bpuPreview && (
                    <p className="mt-1.5 text-[11px] text-muted bg-accent-subtle rounded px-2 py-1">
                      {bpuPreview}
                    </p>
                  )}
                </div>

                {/* راندمان */}
                <div>
                  <FieldLabel>راندمان (%)</FieldLabel>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={form.yieldPct}
                    onChange={(e) => setForm((f) => ({ ...f, yieldPct: e.target.value }))}
                    className="w-full h-11 px-3 text-[13px] border border-border rounded-lg bg-surface focus:outline-none focus:ring-1 focus:ring-accent num"
                  />
                </div>

                {/* حداقل موجودی */}
                <div>
                  <FieldLabel>حداقل موجودی (واحد پایه)</FieldLabel>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.minBase}
                    onChange={(e) => setForm((f) => ({ ...f, minBase: e.target.value }))}
                    className="w-full h-11 px-3 text-[13px] border border-border rounded-lg bg-surface focus:outline-none focus:ring-1 focus:ring-accent num"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ─── Submit ─── */}
          <Button
            onClick={handleSave}
            disabled={!form.branchId || !form.name.trim() || saving}
            className="w-full"
          >
            {saving
              ? 'در حال ذخیره...'
              : editItem
                ? 'ذخیره تغییرات'
                : 'افزودن قلم'}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
