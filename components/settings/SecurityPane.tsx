'use client';

import { useEffect, useState } from 'react';
import {
  Shield,
  LogIn,
  LogOut,
  Key,
  CheckCircle2,
  XCircle,
  Trash2,
  UserPlus,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardBody, CardHeader, Empty } from '@/components/ui';
import { cn } from '@/lib/utils';

/**
 * SecurityPane — لاگ امنیتی و آمار.
 * فقط SuperAdmin در Settings می‌بیند.
 */

interface AuditEntry {
  id: string;
  action: string;
  userId: string | null;
  ip: string | null;
  meta: string | null;
  createdAt: string;
}

const ACTION_META: Record<string, { icon: typeof Shield; label: string; color: string }> = {
  'login.success': { icon: LogIn, label: 'ورود موفق', color: 'text-emerald-700' },
  'login.failed': { icon: AlertTriangle, label: 'ورود ناموفق', color: 'text-amber-700' },
  'login.blocked': { icon: Shield, label: 'بلاک شد', color: 'text-rose-700' },
  'logout': { icon: LogOut, label: 'خروج', color: 'text-stone-500' },
  'password.changed': { icon: Key, label: 'تغییر رمز', color: 'text-blue-700' },
  'transaction.approved': { icon: CheckCircle2, label: 'تایید تراکنش', color: 'text-emerald-700' },
  'transaction.rejected': { icon: XCircle, label: 'رد تراکنش', color: 'text-rose-700' },
  'transaction.deleted': { icon: Trash2, label: 'حذف تراکنش', color: 'text-rose-700' },
  'user.created': { icon: UserPlus, label: 'کاربر جدید', color: 'text-blue-700' },
  'user.deleted': { icon: Trash2, label: 'حذف کاربر', color: 'text-rose-700' },
};

export function SecurityPane() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/audit', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        setLogs(d.logs ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // آمار
  const failedLogins = logs.filter((l) => l.action === 'login.failed').length;
  const blockedAttempts = logs.filter((l) => l.action === 'login.blocked').length;
  const successLogins = logs.filter((l) => l.action === 'login.success').length;

  return (
    <div className="space-y-6">
      {/* آمار */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardBody>
            <div className="text-[11px] text-stone-500 mb-1">ورود موفق (۱۰۰ آخر)</div>
            <div className="text-[22px] font-medium text-emerald-700 tabular-nums">{successLogins}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-[11px] text-stone-500 mb-1">تلاش ناموفق</div>
            <div className="text-[22px] font-medium text-amber-700 tabular-nums">{failedLogins}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-[11px] text-stone-500 mb-1">IP بلاک شده</div>
            <div className="text-[22px] font-medium text-rose-700 tabular-nums">{blockedAttempts}</div>
          </CardBody>
        </Card>
      </div>

      {/* Audit Log */}
      <Card>
        <CardHeader title="لاگ امنیتی" sub="آخرین ۱۰۰ رویداد" />
        {loading ? (
          <CardBody>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 bg-stone-100 rounded animate-pulse" />
              ))}
            </div>
          </CardBody>
        ) : logs.length === 0 ? (
          <CardBody>
            <Empty title="هنوز رویدادی ثبت نشده" icon={Shield} />
          </CardBody>
        ) : (
          <div className="divide-y divide-stone-50">
            {logs.map((entry) => {
              const meta = ACTION_META[entry.action];
              const Icon = meta?.icon ?? Shield;
              const label = meta?.label ?? entry.action;
              const color = meta?.color ?? 'text-stone-500';

              const date = new Date(entry.createdAt);
              const formatted = isNaN(date.getTime())
                ? entry.createdAt
                : new Intl.DateTimeFormat('fa-IR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }).format(date);

              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-stone-50/50 transition-colors"
                >
                  <div className={cn('flex-shrink-0', color)}>
                    <Icon size={13} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={cn('text-[12.5px]', color)}>{label}</span>
                    {entry.ip && (
                      <span className="text-[11px] text-stone-400 mr-2" dir="ltr">
                        {entry.ip}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-stone-400 flex-shrink-0">
                    {formatted}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
