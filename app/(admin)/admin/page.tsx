import { db, schema } from '@/lib/db/client';
import { desc, count } from 'drizzle-orm';
import { Users, Shield, ClipboardList, Activity } from 'lucide-react';

export default async function AdminDashboardPage() {
  const [userCount] = await db.select({ count: count() }).from(schema.users);
  const recentAudit = await db
    .select()
    .from(schema.auditLog)
    .orderBy(desc(schema.auditLog.createdAt))
    .limit(10);

  const stats = [
    { label: 'کل کاربران', value: userCount?.count ?? 0, icon: Users, color: 'text-indigo-400' },
    { label: 'رویدادهای اخیر', value: recentAudit.length, icon: Activity, color: 'text-emerald-400' },
    { label: 'پنل امنیتی', value: 'فعال', icon: Shield, color: 'text-amber-400' },
    { label: 'لاگ سیستم', value: 'آنلاین', icon: ClipboardList, color: 'text-sky-400' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">داشبورد مدیریت</h1>
        <p className="text-sm text-stone-400 mt-1">نمای کلی سیستم برای Super Admin</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-stone-900 border border-stone-800 rounded-xl p-4 flex flex-col gap-2">
            <s.icon size={20} className={s.color} />
            <div className="text-2xl font-bold text-stone-100">{s.value}</div>
            <div className="text-xs text-stone-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-base font-semibold text-stone-200 mb-3">آخرین رویدادهای امنیتی</h2>
        <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
          {recentAudit.length === 0 ? (
            <p className="text-stone-500 text-sm p-6 text-center">هنوز رویدادی ثبت نشده</p>
          ) : (
            <table className="w-full text-sm text-right">
              <thead className="bg-stone-800 text-stone-400 text-xs">
                <tr>
                  <th className="px-4 py-2.5">رویداد</th>
                  <th className="px-4 py-2.5">کاربر</th>
                  <th className="px-4 py-2.5">IP</th>
                  <th className="px-4 py-2.5">زمان</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {recentAudit.map(r => (
                  <tr key={r.id} className="text-stone-300">
                    <td className="px-4 py-2.5 font-mono text-xs">{r.action}</td>
                    <td className="px-4 py-2.5 text-stone-400">{r.userId ?? '—'}</td>
                    <td className="px-4 py-2.5 text-stone-500">{r.ip ?? '—'}</td>
                    <td className="px-4 py-2.5 text-stone-500 text-xs">
                      {r.createdAt ? new Date(r.createdAt).toLocaleString('fa-IR') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
