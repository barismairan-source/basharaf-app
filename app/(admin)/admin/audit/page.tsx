'use client';

import { useEffect, useState } from 'react';
import { AdminTable, type AdminColumn } from '@/components/admin/AdminTable';
import { RefreshCw } from 'lucide-react';

interface AuditEntry {
  id: string;
  action: string;
  userId: string | null;
  ip: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string | null;
}

const COLUMNS: AdminColumn<AuditEntry>[] = [
  {
    key: 'action',
    label: 'رویداد',
    render: row => (
      <span className="font-mono text-xs text-indigo-300">{row.action}</span>
    ),
  },
  {
    key: 'userId',
    label: 'کاربر',
    render: row => <span className="text-xs text-stone-400">{row.userId ?? '—'}</span>,
  },
  {
    key: 'meta',
    label: 'جزئیات',
    render: row => row.meta ? (
      <span className="text-xs text-stone-500 font-mono">
        {JSON.stringify(row.meta).slice(0, 60)}
      </span>
    ) : <span className="text-stone-600">—</span>,
  },
  { key: 'ip', label: 'IP', className: 'text-stone-500 text-xs' },
  {
    key: 'createdAt',
    label: 'زمان',
    sortable: true,
    render: row => (
      <span className="text-xs text-stone-400">
        {row.createdAt ? new Date(row.createdAt).toLocaleString('fa-IR') : '—'}
      </span>
    ),
  },
];

export default function AdminAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  async function load(p: number) {
    setLoading(true);
    const res = await fetch(`/api/admin/audit?page=${p}&limit=50`);
    const d = await res.json();
    setEntries(d.entries ?? []);
    setPage(p);
    setLoading(false);
  }

  useEffect(() => { load(1); }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">لاگ ادیت</h1>
          <p className="text-sm text-stone-400 mt-1">تمام رویدادهای مهم سیستم — غیرقابل‌حذف</p>
        </div>
        <button
          onClick={() => load(page)}
          className="flex items-center gap-2 text-sm text-stone-400 hover:text-stone-200 transition-colors"
        >
          <RefreshCw size={14} />
          بروزرسانی
        </button>
      </div>

      {loading ? (
        <p className="text-stone-500 text-sm">در حال بارگذاری...</p>
      ) : (
        <>
          <AdminTable
            rows={entries}
            columns={COLUMNS}
            searchKeys={['action', 'userId']}
            emptyText="هنوز رویدادی ثبت نشده"
          />
          <div className="flex gap-2 text-sm">
            <button
              onClick={() => load(page - 1)}
              disabled={page <= 1 || loading}
              className="px-3 py-1 rounded bg-stone-800 text-stone-300 disabled:opacity-40"
            >صفحه قبل</button>
            <span className="px-3 py-1 text-stone-500">صفحه {page}</span>
            <button
              onClick={() => load(page + 1)}
              disabled={entries.length < 50 || loading}
              className="px-3 py-1 rounded bg-stone-800 text-stone-300 disabled:opacity-40"
            >صفحه بعد</button>
          </div>
        </>
      )}
    </div>
  );
}
