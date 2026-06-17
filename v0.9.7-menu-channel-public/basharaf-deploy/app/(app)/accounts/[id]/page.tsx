'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, ArrowUpCircle, ArrowDownCircle, Printer } from 'lucide-react';
import { Card, CardBody, CardHeader, Empty } from '@/components/ui';
import { useAppStore } from '@/store';
import { fmt, cn } from '@/lib/utils';

interface LedgerEntry {
  id: string;
  title: string;
  type: string;
  date: string;
  delta: number;
  balance: number;
  payee: string;
  isIncoming: boolean;
}

export default function AccountLedgerPage() {
  const params = useParams();
  const router = useRouter();
  const user = useAppStore(s => s.user);
  const id = params.id as string;

  const [account, setAccount] = useState<{ name: string; balance: number } | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/accounts/${id}/ledger`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.account) setAccount(d.account);
        if (d.entries) setEntries(d.entries);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (!user) return null;

  return (
    <div className="p-4 lg:p-6 print:p-2">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 print:hidden">
          <button onClick={() => router.push('/accounts')} className="flex items-center gap-1.5 text-[12px] text-stone-500 hover:text-stone-800">
            <ArrowRight size={14} strokeWidth={1.5} />
            بازگشت به صندوق‌ها
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 h-9 px-3 rounded-md border border-stone-200 text-[12px] text-stone-600 hover:bg-stone-50">
            <Printer size={13} strokeWidth={1.5} />
            <span className="hidden sm:inline">چاپ</span>
          </button>
        </div>

        {loading ? (
          <div className="h-64 bg-stone-100 rounded-lg animate-pulse" />
        ) : account ? (
          <>
            {/* Account header */}
            <Card>
              <CardBody>
                <div className="text-[13px] text-stone-500 mb-1">دفتر کل — {account.name}</div>
                <div className={cn('text-[26px] font-medium tabular-nums', account.balance >= 0 ? 'text-stone-900' : 'text-rose-700')}>
                  {fmt(account.balance)}
                </div>
                <div className="text-[10.5px] text-stone-400 mt-0.5">موجودی فعلی (تومان)</div>
              </CardBody>
            </Card>

            {/* Ledger */}
            <Card>
              <CardHeader title="گردش حساب" sub={`${entries.length} تراکنش`} />
              {entries.length === 0 ? (
                <CardBody><Empty title="تراکنشی برای این حساب نیست" /></CardBody>
              ) : (
                <CardBody className="p-0 overflow-x-auto">
                  <table className="w-full min-w-[480px]">
                    <thead className="bg-stone-50/50 border-b border-stone-100">
                      <tr>
                        <th className="text-right text-[11px] text-stone-500 font-normal px-5 py-3">شرح</th>
                        <th className="text-center text-[11px] text-stone-500 font-normal px-3 py-3">تاریخ</th>
                        <th className="text-end text-[11px] text-stone-500 font-normal px-3 py-3">مبلغ</th>
                        <th className="text-end text-[11px] text-stone-500 font-normal px-5 py-3">مانده</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map(e => (
                        <tr key={e.id} className="border-b border-stone-50 last:border-b-0">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              {e.isIncoming ? (
                                <ArrowUpCircle size={13} className="text-emerald-600 flex-shrink-0" strokeWidth={1.5} />
                              ) : (
                                <ArrowDownCircle size={13} className="text-rose-600 flex-shrink-0" strokeWidth={1.5} />
                              )}
                              <div>
                                <div className="text-[12.5px] text-stone-800">{e.title}</div>
                                <div className="text-[10px] text-stone-400">{e.payee}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center"><span className="text-[11px] text-stone-500">{e.date}</span></td>
                          <td className="px-3 py-3 text-end">
                            <span className={cn('text-[12px] tabular-nums', e.isIncoming ? 'text-emerald-700' : 'text-rose-700')}>
                              {e.isIncoming ? '+' : '−'}{fmt(Math.abs(e.delta))}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-end">
                            <span className="text-[12px] text-stone-700 tabular-nums font-medium">{fmt(e.balance)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardBody>
              )}
            </Card>
          </>
        ) : (
          <Card><CardBody><Empty title="حساب پیدا نشد" /></CardBody></Card>
        )}
      </div>
    </div>
  );
}
