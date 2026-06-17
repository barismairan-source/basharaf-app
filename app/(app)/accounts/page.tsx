'use client';

import { useEffect, useState } from 'react';
import { Banknote, Plus, PiggyBank, CreditCard, Trash2, Edit3, X, Check, RefreshCw } from 'lucide-react';
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
};

const TYPE_LABELS: Record<string, string> = {
  cash: 'صندوق نقدی',
  bank: 'حساب بانکی',
  pos: 'دستگاه پوز',
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
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

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

  async function handleDelete(id: string) {
    const ok = await deleteAccount(id);
    if (ok) showToast('حساب غیرفعال شد', 'success');
    else showToast('خطا', 'danger');
  }

  const columns: DataColumn<Account>[] = [
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
          <div className="text-[10px] text-muted mt-0.5">مشاهده دفتر کل</div>
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
              onClick={e => { e.stopPropagation(); handleDelete(account.id); }}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-rose-50 text-muted hover:text-rose-600"
            >
              <Trash2 size={13} strokeWidth={1.5} />
            </button>
          </div>
        );
      },
    }] as DataColumn<Account>[] : []),
  ];

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

        {/* Total balance card */}
        <Card>
          <CardBody>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11.5px] text-muted mb-1">مجموع موجودی همه حساب‌ها</div>
                <div
                  className={cn('text-[22px] sm:text-[28px] font-medium num truncate', totalBalance >= 0 ? 'text-stone-900' : 'text-rose-700')}
                  title={`${fmt(totalBalance)} تومان`}
                >
                  {formatMoneyShort(totalBalance)}
                </div>
              </div>
              <Banknote size={32} strokeWidth={1} className="text-stone-400 flex-shrink-0" />
            </div>
          </CardBody>
        </Card>

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

        {/* Accounts list */}
        <DataList
          columns={columns}
          data={accounts}
          keyExtractor={a => a.id}
          empty={<Empty title="هنوز حسابی ثبت نشده" sub={isAdmin ? 'از دکمه بالا یک حساب اضافه کنید' : 'حسابی وجود ندارد'} icon={Banknote} />}
        />
      </div>
    </div>
  );
}
