'use client';

import { useEffect, useMemo, useState } from 'react';
import { Banknote, Plus, PiggyBank, CreditCard, Trash2, Edit3, X, Check, RefreshCw, Handshake } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, DataList, Empty, Field, Input, Select } from '@/components/ui';
import type { DataColumn } from '@/components/ui/DataList';
import { useAppStore } from '@/store';
import { fmt, cn } from '@/lib/utils';
import { formatMoneyShort } from '@/lib/design/format';
import type { Account } from '@/types/transaction';

const TYPE_ICONS: Record<string, typeof Banknote> = {
  cash: PiggyBank,
  bank: Banknote,
  pos: CreditCard,
  partner_equity: Handshake,
};

const TYPE_LABELS: Record<string, string> = {
  cash: 'صندوق نقدی',
  bank: 'حساب بانکی',
  pos: 'دستگاه پوز',
  partner_equity: 'آورده شریک',
};

export default function AccountsPage() {
  const user = useAppStore(s => s.user);
  const accounts = useAppStore(s => s.accounts);
  const loadAccounts = useAppStore(s => s.loadAccounts);
  const createAccount = useAppStore(s => s.createAccount);
  const updateAccount = useAppStore(s => s.updateAccount);
  const deleteAccount = useAppStore(s => s.deleteAccount);
  const showToast = useAppStore(s => s.showToast);

  const [hydrated, setHydrated] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'cash' | 'bank' | 'pos'>('cash');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [adding, setAdding] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    setHydrated(true);
    loadAccounts();
  }, [loadAccounts]);

  const { operational, equity } = useMemo(() => ({
    operational: accounts.filter(a => a.type !== 'partner_equity'),
    equity: accounts.filter(a => a.type === 'partner_equity'),
  }), [accounts]);

  const operationalBalance = useMemo(
    () => operational.reduce((s, a) => s + a.balance, 0),
    [operational]
  );
  const equityBalance = useMemo(
    () => equity.reduce((s, a) => s + a.balance, 0),
    [equity]
  );

  async function handleRecalculate() {
    setRecalculating(true);
    try {
      const res = await fetch('/api/accounts/recalculate', { method: 'POST', credentials: 'include' });
      if (res.ok) {
        await loadAccounts();
        showToast('موجودی همه حساب‌ها بازسازی شد', 'success');
      } else {
        showToast('خطا در بازسازی', 'danger');
      }
    } finally {
      setRecalculating(false);
    }
  }

  if (!hydrated || !user) return null;

  const isAdmin = user.role === 'SuperAdmin';

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    const a = await createAccount({ name: newName.trim(), type: newType });
    setAdding(false);
    if (a) {
      showToast('حساب اضافه شد', 'success', a.name);
      setShowAdd(false);
      setNewName('');
    } else {
      showToast('خطا در افزودن حساب', 'danger');
    }
  }

  async function handleEditSave(id: string) {
    const ok = await updateAccount(id, { name: editName.trim() });
    if (ok) { showToast('ذخیره شد', 'success'); setEditingId(null); }
    else showToast('خطا', 'danger');
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`حساب «${name}» غیرفعال شود؟`)) return;
    const ok = await deleteAccount(id);
    if (ok) showToast('حساب غیرفعال شد', 'success');
    else showToast('خطا', 'danger');
  }

  function makeColumns(showType = false): DataColumn<Account>[] {
    return [
      {
        key: 'name',
        label: 'حساب',
        render: (account) => {
          const Icon = TYPE_ICONS[account.type] ?? Banknote;
          return (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-md bg-stone-100 flex items-center justify-center flex-shrink-0">
                <Icon size={16} strokeWidth={1.5} className="text-stone-600" />
              </div>
              <div className="min-w-0">
                {editingId === account.id ? (
                  <Input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="text-[13px]"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleEditSave(account.id)}
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <div className="text-[13px] text-stone-900 font-medium truncate">{account.name}</div>
                )}
                <div className="text-[11px] text-muted">{TYPE_LABELS[account.type] ?? account.type}</div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'balance',
        label: 'موجودی',
        render: (account) => (
          <button
            onClick={e => { e.stopPropagation(); window.location.href = `/accounts/${account.id}`; }}
            className="group text-right"
            title={`${fmt(account.balance)} تومان`}
          >
            <div className={cn('text-[14px] font-medium num group-hover:underline', account.balance >= 0 ? 'text-stone-900' : 'text-rose-700')}>
              {formatMoneyShort(account.balance)}
            </div>
            {account.type === 'partner_equity' && account.balance < 0 && (
              <div className="text-[10px] text-rose-600 mt-0.5">آورده‌ی خرج‌شده</div>
            )}
            {account.type !== 'partner_equity' && (
              <div className="text-[10px] text-muted mt-0.5">مشاهده دفتر کل</div>
            )}
          </button>
        ),
      },
      ...(isAdmin ? [{
        key: 'actions',
        label: '',
        mobileLabel: '',
        render: (account: Account) => {
          if (editingId === account.id) {
            return (
              <div className="flex items-center gap-1">
                <button
                  onClick={e => { e.stopPropagation(); handleEditSave(account.id); }}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-emerald-50 text-emerald-600"
                >
                  <Check size={13} strokeWidth={1.5} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setEditingId(null); }}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-stone-50 text-muted"
                >
                  <X size={13} strokeWidth={1.5} />
                </button>
              </div>
            );
          }
          return (
            <div className="flex items-center gap-1">
              <button
                onClick={e => { e.stopPropagation(); setEditingId(account.id); setEditName(account.name); }}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-stone-50 text-muted"
              >
                <Edit3 size={13} strokeWidth={1.5} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); handleDelete(account.id, account.name); }}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-rose-50 text-muted hover:text-rose-600"
              >
                <Trash2 size={13} strokeWidth={1.5} />
              </button>
            </div>
          );
        },
      }] as DataColumn<Account>[] : []),
    ];
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[20px] font-medium text-stone-900 tracking-tight">صندوق‌ها و حساب‌ها</h1>
            <div className="text-[12px] text-muted mt-1">مدیریت موجودی حساب‌های بانکی و صندوق‌های نقدی</div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="default" size="sm" icon={RefreshCw} loading={recalculating} onClick={handleRecalculate}>
                بازسازی موجودی
              </Button>
              <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowAdd(true)}>
                حساب جدید
              </Button>
            </div>
          )}
        </div>

        {/* Total balance cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardBody>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11.5px] text-muted mb-1">موجودی عملیاتی</div>
                  <div
                    className={cn('text-[22px] sm:text-[26px] font-medium num truncate', operationalBalance >= 0 ? 'text-stone-900' : 'text-rose-700')}
                    title={`${fmt(operationalBalance)} تومان`}
                  >
                    {formatMoneyShort(operationalBalance)}
                  </div>
                  <div className="text-[10px] text-muted mt-0.5">بدون آورده شرکا</div>
                </div>
                <Banknote size={28} strokeWidth={1} className="text-stone-300 flex-shrink-0" />
              </div>
            </CardBody>
          </Card>
          {equity.length > 0 && (
            <Card>
              <CardBody>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11.5px] text-muted mb-1">جمع آورده شرکا</div>
                    <div
                      className={cn('text-[22px] sm:text-[26px] font-medium num truncate', equityBalance >= 0 ? 'text-stone-900' : 'text-rose-700')}
                      title={`${fmt(equityBalance)} تومان`}
                    >
                      {formatMoneyShort(equityBalance)}
                    </div>
                    {equityBalance < 0 && (
                      <div className="text-[10px] text-rose-600 mt-0.5">آورده‌ی خرج‌شده</div>
                    )}
                  </div>
                  <Handshake size={28} strokeWidth={1} className="text-violet-300 flex-shrink-0" />
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Add form */}
        {showAdd && isAdmin && (
          <Card>
            <CardHeader title="افزودن حساب جدید" />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="نام حساب">
                  <Input
                    placeholder="مثلاً: صندوق شعبه تجریش"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  />
                </Field>
                <Field label="نوع">
                  <Select value={newType} onChange={e => setNewType(e.target.value as 'cash' | 'bank' | 'pos')}>
                    <option value="cash">صندوق نقدی</option>
                    <option value="bank">حساب بانکی</option>
                    <option value="pos">دستگاه پوز</option>
                  </Select>
                </Field>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="default" size="sm" onClick={() => { setShowAdd(false); setNewName(''); }}>لغو</Button>
                <Button variant="primary" size="sm" icon={Plus} loading={adding} onClick={handleAdd} disabled={!newName.trim()}>
                  افزودن
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* ─── عملیاتی ─── */}
        <div>
          <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide mb-3">
            عملیاتی — نقدی · بانک · پوز
          </div>
          <DataList
            columns={makeColumns()}
            data={operational}
            keyExtractor={a => a.id}
            empty={<Empty title="هنوز حسابی ثبت نشده" sub={isAdmin ? 'از دکمه بالا یک حساب اضافه کنید' : 'حسابی وجود ندارد'} icon={Banknote} />}
          />
        </div>

        {/* ─── آورده شرکا ─── */}
        {equity.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide mb-3">
              آورده شرکا — partner equity
            </div>
            <DataList
              columns={makeColumns()}
              data={equity}
              keyExtractor={a => a.id}
              empty={null}
            />
          </div>
        )}
      </div>
    </div>
  );
}
