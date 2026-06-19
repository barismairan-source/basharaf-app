'use client';

import { useEffect, useState } from 'react';
import { AdminTable, type AdminColumn } from '@/components/admin/AdminTable';
import { useRouter } from 'next/navigation';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  assignedBranch: string | null;
  isActive: boolean;
  joined: string;
}

const ROLE_LABELS: Record<string, string> = {
  SuperAdmin: 'مدیر کل',
  BranchUser: 'کاربر شعبه',
  Warehouse: 'انباردار',
  Chef: 'سرآشپز',
};

const COLUMNS: AdminColumn<UserRow>[] = [
  {
    key: 'name',
    label: 'نام',
    sortable: true,
    render: row => (
      <span className="font-medium text-stone-100">{row.name}</span>
    ),
  },
  { key: 'email', label: 'ایمیل', sortable: true, className: 'text-stone-400 text-xs' },
  {
    key: 'role',
    label: 'نقش',
    render: row => (
      <span className="text-xs bg-stone-800 text-stone-300 px-2 py-0.5 rounded-full">
        {ROLE_LABELS[row.role] ?? row.role}
      </span>
    ),
  },
  {
    key: 'isActive',
    label: 'وضعیت',
    render: row => (
      <span className={`text-xs font-medium ${row.isActive ? 'text-emerald-400' : 'text-rose-400'}`}>
        {row.isActive ? 'فعال' : 'معلق'}
      </span>
    ),
  },
  { key: 'joined', label: 'عضویت', sortable: true, className: 'text-stone-500 text-xs' },
];

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionUser, setActionUser] = useState<UserRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [impLoading, setImpLoading] = useState(false);

  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(d => setUsers(d.users ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function toggleActive(user: UserRow) {
    setBusy(true);
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: !u.isActive } : u));
      setActionUser(null);
    }
    setBusy(false);
  }

  async function impersonate(user: UserRow) {
    setImpLoading(true);
    const res = await fetch('/api/admin/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: user.id }),
    });
    if (res.ok) {
      router.push('/dashboard');
      router.refresh();
    }
    setImpLoading(false);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">مدیریت کاربران</h1>
        <p className="text-sm text-stone-400 mt-1">فعال‌سازی، تعلیق، و جعل هویت کاربران</p>
      </div>

      {loading ? (
        <p className="text-stone-500 text-sm">در حال بارگذاری...</p>
      ) : (
        <AdminTable
          rows={users}
          columns={COLUMNS}
          searchKeys={['name', 'email']}
          onRowClick={row => setActionUser(row)}
          emptyText="کاربری یافت نشد"
        />
      )}

      {actionUser && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setActionUser(null)}>
          <div className="bg-stone-900 border border-stone-700 rounded-2xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-stone-100">{actionUser.name}</h2>
            <p className="text-xs text-stone-400">{actionUser.email} — {ROLE_LABELS[actionUser.role] ?? actionUser.role}</p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => toggleActive(actionUser)}
                disabled={busy}
                className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                  actionUser.isActive
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {busy ? '...' : actionUser.isActive ? 'تعلیق کاربر' : 'فعال‌سازی کاربر'}
              </button>
              {actionUser.role !== 'SuperAdmin' && (
                <button
                  onClick={() => impersonate(actionUser)}
                  disabled={impLoading || !actionUser.isActive}
                  className="w-full py-2 rounded-lg text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 transition-colors"
                >
                  {impLoading ? '...' : 'جعل هویت (Login As)'}
                </button>
              )}
              <button
                onClick={() => setActionUser(null)}
                className="w-full py-2 rounded-lg text-sm text-stone-400 hover:text-stone-200 transition-colors"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
