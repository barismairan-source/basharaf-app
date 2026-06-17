'use client';

import { useEffect, useState } from 'react';
import { Users, Plus, Trash2, ArrowUpCircle, ArrowDownCircle, Pencil, Check, X } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, Field, Input, Empty, Chip } from '@/components/ui';
import { useAppStore } from '@/store';
import { fmt, cn } from '@/lib/utils';

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

  // inline edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setHydrated(true); loadContacts(); }, [loadContacts]);

  if (!hydrated || !user) return null;
  const isAdmin = user.role === 'SuperAdmin';

  // unique types across all contacts (for datalist suggestions)
  const existingTypes = Array.from(new Set(contacts.map(c => c.type)));

  const totalReceivable = contacts.filter(c => c.balance > 0).reduce((s, c) => s + c.balance, 0);
  const totalPayable = contacts.filter(c => c.balance < 0).reduce((s, c) => s + Math.abs(c.balance), 0);

  function startEdit(c: typeof contacts[0]) {
    setEditId(c.id);
    setEditName(c.name);
    setEditType(c.type);
    setEditPhone(c.phone ?? '');
  }

  function cancelEdit() {
    setEditId(null);
  }

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

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-medium text-stone-900 tracking-tight">طرف‌حساب‌ها</h1>
            <div className="text-[12px] text-stone-500 mt-1">بدهکاران و بستانکاران</div>
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
                <span className="text-[11.5px] text-stone-500">طلب ما (دیگران بدهکار)</span>
              </div>
              <div className="text-[20px] font-medium text-emerald-700 tabular-nums">{fmt(totalReceivable)}</div>
              <div className="text-[10px] text-stone-400 mt-0.5">تومان</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownCircle size={14} className="text-rose-600" strokeWidth={1.5} />
                <span className="text-[11.5px] text-stone-500">بدهی ما</span>
              </div>
              <div className="text-[20px] font-medium text-rose-700 tabular-nums">{fmt(totalPayable)}</div>
              <div className="text-[10px] text-stone-400 mt-0.5">تومان</div>
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
        {contacts.length === 0 ? (
          <Card><CardBody><Empty title="طرف‌حسابی ثبت نشده" icon={Users} /></CardBody></Card>
        ) : (
          <Card>
            <CardBody className="p-0 overflow-x-auto">
              <table className="w-full min-w-[400px]">
                <thead className="bg-stone-50/50 border-b border-stone-100">
                  <tr>
                    <th className="text-right text-[11px] text-stone-500 font-normal px-5 py-3">نام</th>
                    <th className="text-center text-[11px] text-stone-500 font-normal px-3 py-3">نوع</th>
                    <th className="text-end text-[11px] text-stone-500 font-normal px-5 py-3">مانده</th>
                    {isAdmin && <th className="w-20"></th>}
                  </tr>
                </thead>
                <tbody>
                  {contacts.map(c => (
                    editId === c.id ? (
                      /* ── Edit row ── */
                      <tr key={c.id} className="border-b border-stone-100 bg-stone-50/60">
                        <td className="px-3 py-2">
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
                            className="w-full h-7 px-2 mt-1 rounded border border-stone-200 text-[11px] focus:outline-none bg-white"
                          />
                        </td>
                        <td className="px-3 py-2">
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
                        </td>
                        <td className="px-5 py-2 text-end">
                          <span className="text-[11px] text-stone-400">—</span>
                        </td>
                        <td className="px-3 py-2 text-center">
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
                              className="w-7 h-7 flex items-center justify-center rounded hover:bg-stone-100 text-stone-500"
                            >
                              <X size={13} strokeWidth={2} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      /* ── Display row ── */
                      <tr key={c.id} className="border-b border-stone-50 last:border-b-0 hover:bg-stone-50/50">
                        <td className="px-5 py-3">
                          <div className="text-[12.5px] text-stone-800">{c.name}</div>
                          {c.phone && <div className="text-[10.5px] text-stone-400" dir="ltr">{c.phone}</div>}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Chip tone="neutral">{typeLabel(c.type)}</Chip>
                        </td>
                        <td className="px-5 py-3 text-end">
                          {c.balance === 0 ? (
                            <span className="text-[11px] text-stone-400">تسویه</span>
                          ) : c.balance > 0 ? (
                            <div>
                              <span className="text-[12.5px] text-emerald-700 tabular-nums font-medium">{fmt(c.balance)}</span>
                              <div className="text-[9.5px] text-stone-400">بدهکار به ما</div>
                            </div>
                          ) : (
                            <div>
                              <span className="text-[12.5px] text-rose-700 tabular-nums font-medium">{fmt(Math.abs(c.balance))}</span>
                              <div className="text-[9.5px] text-stone-400">طلبکار از ما</div>
                            </div>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-3 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => startEdit(c)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-stone-100 text-stone-400 hover:text-stone-600">
                                <Pencil size={12} strokeWidth={1.5} />
                              </button>
                              <button onClick={() => handleDelete(c.id)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-rose-50 text-stone-400 hover:text-rose-600">
                                <Trash2 size={13} strokeWidth={1.5} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
