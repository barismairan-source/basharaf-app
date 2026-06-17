'use client';

import { useEffect, useState, useCallback } from 'react';
import { AlertCircle, AlertTriangle, Info, RefreshCw, Trash2, ChevronDown, Database, ShieldX } from 'lucide-react';
import { Button, Card, CardBody, Empty, Chip } from '@/components/ui';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';

interface LogRow {
  id: string;
  level: string;
  category: string;
  message: string;
  path: string | null;
  method: string | null;
  statusCode: number | null;
  userEmail: string | null;
  context: string | null;
  stack: string | null;
  ip: string | null;
  createdAt: string;
}

const LEVEL_STYLE: Record<string, { color: string; bg: string; icon: typeof Info; label: string }> = {
  error: { color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200', icon: AlertCircle, label: 'خطا' },
  warn: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: AlertTriangle, label: 'هشدار' },
  info: { color: 'text-sky-700', bg: 'bg-sky-50 border-sky-200', icon: Info, label: 'اطلاع' },
};

export default function LogsPage() {
  const user = useAppStore((s) => s.user);
  const showToast = useAppStore((s) => s.showToast);
  const [hydrated, setHydrated] = useState(false);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = levelFilter === 'all' ? '/api/logs' : `/api/logs?level=${levelFilter}`;
      const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const d = await res.json();
        setLogs(d.logs ?? []);
        setCounts(d.counts ?? {});
      }
    } finally {
      setLoading(false);
    }
  }, [levelFilter]);

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => { if (hydrated) load(); }, [hydrated, load]);

  if (!hydrated || !user) return null;
  if (user.role !== 'SuperAdmin') {
    return <div className="p-6"><Card><CardBody><Empty title="فقط مدیر کل به این بخش دسترسی دارد" icon={ShieldX} /></CardBody></Card></div>;
  }

  async function handleClear() {
    if (!confirm('همه لاگ‌ها پاک شوند؟ این عمل قابل بازگشت نیست.')) return;
    const res = await fetch('/api/logs', { method: 'DELETE', credentials: 'include' });
    if (res.ok) { showToast('لاگ‌ها پاک شد', 'success'); load(); }
    else showToast('خطا در پاک‌سازی', 'danger');
  }

  function fmtTime(iso: string) {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('fa-IR', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).format(d);
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-medium text-stone-900 tracking-tight">لاگ سیستم</h1>
            <div className="text-[12px] text-stone-500 mt-1">رویدادها و خطاهای فنی برای تحلیل</div>
          </div>
          <div className="flex gap-2">
            <Button variant="default" size="sm" icon={RefreshCw} onClick={load} loading={loading}>تازه‌سازی</Button>
            <Button variant="default" size="sm" icon={Trash2} onClick={handleClear}>پاک‌سازی</Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          {(['error', 'warn', 'info'] as const).map((lv) => {
            const s = LEVEL_STYLE[lv]!;
            const Icon = s.icon;
            return (
              <button key={lv} onClick={() => setLevelFilter(levelFilter === lv ? 'all' : lv)}
                className={cn('text-right p-3 rounded-lg border transition-all', s.bg,
                  levelFilter === lv ? 'ring-2 ring-stone-300' : '')}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={14} className={s.color} strokeWidth={1.5} />
                  <span className="text-[11.5px] text-stone-500">{s.label}</span>
                </div>
                <div className={cn('text-[20px] font-medium tabular-nums', s.color)}>{counts[lv] ?? 0}</div>
                <div className="text-[9.5px] text-stone-400 mt-0.5">۲۴ ساعت اخیر</div>
              </button>
            );
          })}
        </div>

        {levelFilter !== 'all' && (
          <button onClick={() => setLevelFilter('all')} className="text-[12px] text-stone-500 hover:text-stone-800">
            ← نمایش همه
          </button>
        )}

        {/* Logs list */}
        {loading ? (
          <div className="h-64 bg-stone-100 rounded-lg animate-pulse" />
        ) : logs.length === 0 ? (
          <Card><CardBody><Empty title="لاگی ثبت نشده" icon={Database} /></CardBody></Card>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const s = LEVEL_STYLE[log.level] ?? LEVEL_STYLE.info!;
              const Icon = s.icon;
              const isOpen = expanded === log.id;
              return (
                <div key={log.id} className="bg-white border border-stone-200 rounded-lg overflow-hidden">
                  <button onClick={() => setExpanded(isOpen ? null : log.id)} className="w-full text-right p-3 hover:bg-stone-50/50 flex items-start gap-3">
                    <Icon size={15} className={cn('flex-shrink-0 mt-0.5', s.color)} strokeWidth={1.5} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Chip tone="neutral">{log.category}</Chip>
                        {log.statusCode && <span className={cn('text-[10.5px] tabular-nums', s.color)}>{log.statusCode}</span>}
                        {log.method && log.path && (
                          <span className="text-[10.5px] text-stone-400" dir="ltr">{log.method} {log.path}</span>
                        )}
                      </div>
                      <div className="text-[12.5px] text-stone-800 mt-1 truncate">{log.message}</div>
                      <div className="text-[10px] text-stone-400 mt-0.5">
                        {fmtTime(log.createdAt)}
                        {log.userEmail && <span> · {log.userEmail}</span>}
                        {log.ip && <span dir="ltr"> · {log.ip}</span>}
                      </div>
                    </div>
                    <ChevronDown size={14} className={cn('text-stone-400 transition-transform flex-shrink-0', isOpen && 'rotate-180')} />
                  </button>
                  {isOpen && (log.context || log.stack) && (
                    <div className="border-t border-stone-100 p-3 bg-stone-50/50 space-y-2">
                      {log.context && (
                        <div>
                          <div className="text-[10.5px] text-stone-500 mb-1">جزئیات:</div>
                          <pre className="text-[11px] text-stone-700 bg-white p-2 rounded border border-stone-200 overflow-x-auto" dir="ltr">{log.context}</pre>
                        </div>
                      )}
                      {log.stack && (
                        <div>
                          <div className="text-[10.5px] text-stone-500 mb-1">Stack trace:</div>
                          <pre className="text-[10px] text-stone-600 bg-white p-2 rounded border border-stone-200 overflow-x-auto leading-5" dir="ltr">{log.stack}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
