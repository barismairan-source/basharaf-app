'use client';

import { useEffect, useState } from 'react';
import { Users, Plus, Trash2, ArrowUpCircle, ArrowDownCircle, Pencil, Check, X } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, DataList, Empty, Field, Input, Chip } from '@/components/ui';
import type { DataColumn } from '@/components/ui/DataList';
import { useAppStore } from '@/store';
import { fmt, cn } from '@/lib/utils';
import { formatMoneyShort } from '@/lib/design/format';
import type { Contact } from '@/types/transaction';

const TYPE_LABELS: Record<string, string> = {
  customer: 'مشتری',
  supplier: 'تأمین‌کننده',
  other: 'سایر',
};

function typeLabel(t: string) {
  return TYPE_LABELS[t] ?? t;
}

export default function ContactsPage() {
  const user = useAppStore(s => s.user);
  const contacts = useAppStore(s => s.contacts);
  const loadContacts = useAppStore(s => s.loadContacts);
  const createContact = useAppStore(s => s.createContact);
  const updateContact = useAppStore(s => s.updateContact);
  const deleteContact = useAppStore(s => s.deleteContact);
  const showToast = useAppStore(s => s.showToast);

  const [hydrated, setHydrated] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('customer');
  const [phone, setPhone] = useState('');
  const [adding, setAdding] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setHydrated(true); loadContacts(); }, [loadContacts]);

  if (!hydrated || !user) return null;
  const isAdmin = user.role === 'SuperAdmin';

  const existingTypes = Array.from(new Set(contacts.map(c => c.type)));

  const totalReceivable = contacts.filter(c => c.balance > 0).reduce((s, c) => s + c.balance, 0);
  const totalPayable = contacts.filter(c => c.balance < 0).reduce((s, c) => s + Math.abs(c.balance), 0);

  function startEdit(c: Contact) {
    setEditId(c.id);
    setEditName(c.name);
    setEditType(c.type);
    setEditPhone(c.phone ?? '');
  }

  function cancelEdit() { setEditId(null); }

  async function saveEdit(id: string) {
    if (!editName.trim() || !editType.trim()) return;
    setSaving(true);
    const ok = await updateContact(id, {
      name: editName.trim(),
      type: editType.trim(),
      phone: editPhone.trim() || null,
    });
    setSaving(false);
    if (ok) { showToast('تغییرات ذخیره شد', 'success'); setEditId(null); }
    else showToast('خطا در ذخیره', 'danger');
  }

  async function handleAdd() {
    if (!name.trim()) return;
    setAdding(true);
    const c = await createContact({ name: name.trim(), type: type.trim() || 'customer', phone: phone.trim() || null });
    setAdding(false);
    if (c) { showToast('طرف‌حساب اضافه شد', 'success', c.name); setShowAdd(false); setName(''); setPhone(''); setType('customer'); }
    else showToast('خطا', 'danger');
  }

  async function handleDelete(id: string) {
    const ok = await deleteContact(id);
    if (ok) showToast('حذف شد', 'success');
  }

  const columns: DataColumn<Contact>[] = [
    {
      key: 'name',
      label: 'نام',
      render: (c) => {
        if (editId === c.id) {
          return (
            <div className="space-y-1">
              <input
                autoFocus
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="نام"
                className="w-full h-8 px-2 rounded border border-stone-300 text-[12.5px] focus:outline-none focus:border-stone-500 bg-white"
              />
              <input
                value={editPhone}
                onChange={e => setEditPhone(e.target.value)}
                placeholder="تلفن"
                dir="ltr"
                className="w-full h-7 px-2 rounded border border-stone-200 text-[11px] focus:outline-none bg-white"
              />
            </div>
          );
        }
        return (
          <div>
            <div className="text-[12.5px] text-stone-800">{c.name}</div>
            {c.phone && <div className="text-[10.5px] text-muted" dir="ltr">{c.phone}</div>}
          </div>
        );
      },
    },
    {
      key: 'type',
      label: 'نوع',
      mobileHide: true,
      render: (c) => {
        if (editId === c.id) {
          return (
            <>
              <input
                list="contact-type-list-edit"
                value={editType}
                onChange={e => setEditType(e.target.value)}
                placeholder="نوع"
                className="w-full h-8 px-2 rounded border border-stone-300 text-[12px] focus:outline-none focus:border-stone-500 bg-white text-center"
              />
              <datalist id="contact-type-list-edit">
                <option value="customer">مشتری</option>
                <option value="supplier">تأمین‌کننده</option>
                <option value="other">سایر</option>
                {existingTypes.filter(t => !['customer', 'supplier', 'other'].includes(t)).map(t => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </>
          );
        }
        return <Chip tone="neutral">{typeLabel(c.type)}</Chip>;
      },
    },
    {
      key: 'balance',
      label: 'مانده',
      cellClassName: 'text-end',
      headerClassName: 'text-end',
      render: (c) => {
        if (editId === c.id) return <span className="text-[11px] text-muted">—</span>;
        if (c.balance === 0) return <span className="text-[11px] text-muted">تسویه</span>;
        if (c.balance > 0) return (
          <div>
            <span className="text-[12.5px] text-emerald-700 num font-medium" title={`${fmt(c.balance)} تومان`}>
              {formatMoneyShort(c.balance)}
            </span>
            <div className="text-[9.5px] text-muted">بدهکار به ما</div>
          </div>
        );
        return (
          <div>
            <span className="text-[12.5px] text-rose-700 num font-medium" title={`${fmt(Math.abs(c.balance))} تومان`}>
              {formatMoneyShort(Math.abs(c.balance))}
            </span>
            <div className="text-[9.5px] text-muted">طلبکار از ما</div>
          </div>
        );
      },
    },
    ...(isAdmin ? [{
      key: 'actions',
      label: '',
      mobileLabel: '',
      cellClassName: 'text-center',
      render: (c: Contact) => {
        if (editId === c.id) {
          return (
            <div className="flex items-center justify-center gap-1">
              <button
                onClick={() => saveEdit(c.id)}
                disabled={saving || !editName.trim() || !editType.trim()}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-emerald-50 text-emerald-600 disabled:opacity-40"
              >
                <Check size={13} strokeWidth={2} />
              </button>
              <button
                onClick={cancelEdit}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-stone-100 text-muted"
              >
                <X size={13} strokeWidth={2} />
              </button>
            </div>
          );
        }
        return (
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={() => startEdit(c)}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-stone-100 text-muted hover:text-stone-600"
            >
              <Pencil size={12} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => handleDelete(c.id)}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-rose-50 text-muted hover:text-rose-600"
            >
              <Trash2 size={13} strokeWidth={1.5} />
            </button>
          </div>
        );
      },
    }] as DataColumn<Contact>[] : []),
  ];

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-medium text-stone-900 tracking-tight">طرف‌حساب‌ها</h1>
            <div className="text-[12px] text-muted mt-1">بدهکاران و بستانکاران</div>
          </div>
          {isAdmin && (
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowAdd(true)}>طرف‌حساب جدید</Button>
          )}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardBody>
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpCircle size={14} className="text-emerald-600" strokeWidth={1.5} />
                <span className="text-[11.5px] text-muted">طلب ما (دیگران بدهکار)</span>
              </div>
              <div
                className="text-[20px] font-medium text-emerald-700 num"
                title={`${fmt(totalReceivable)} تومان`}
              >
                {formatMoneyShort(totalReceivable)}
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownCircle size={14} className="text-rose-600" strokeWidth={1.5} />
                <span className="text-[11.5px] text-muted">بدهی ما</span>
              </div>
              <div
                className="text-[20px] font-medium text-rose-700 num"
                title={`${fmt(totalPayable)} تومان`}
              >
                {formatMoneyShort(totalPayable)}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Add form */}
        {showAdd && isAdmin && (
          <Card>
            <CardHeader title="افزودن طرف‌حساب" />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="نام">
                  <Input placeholder="نام شخص یا شرکت" value={name} onChange={e => setName(e.target.value)} />
                </Field>
                <Field label="نوع">
                  <input
                    list="contact-type-list"
                    placeholder="مشتری، تأمین‌کننده، ..."
                    value={type}
                    onChange={e => setType(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-stone-200 text-[13px] focus:outline-none focus:border-stone-500 bg-white"
                  />
                  <datalist id="contact-type-list">
                    <option value="customer">مشتری</option>
                    <option value="supplier">تأمین‌کننده</option>
                    <option value="other">سایر</option>
                    {existingTypes.filter(t => !['customer', 'supplier', 'other'].includes(t)).map(t => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </Field>
                <Field label="تلفن (اختیاری)">
                  <Input placeholder="۰۹..." dir="ltr" value={phone} onChange={e => setPhone(e.target.value)} />
                </Field>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="default" size="sm" onClick={() => setShowAdd(false)}>لغو</Button>
                <Button variant="primary" size="sm" icon={Plus} loading={adding} onClick={handleAdd} disabled={!name.trim()}>افزودن</Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* List */}
        <DataList
          columns={columns}
          data={contacts}
          keyExtractor={c => c.id}
          empty={<Empty title="طرف‌حسابی ثبت نشده" icon={Users} />}
        />
      </div>
    </div>
  );
}
