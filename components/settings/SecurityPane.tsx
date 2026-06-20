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
  Skull,
  Package,
  RefreshCw,
  RotateCcw,
  UserX,
  UserCheck,
  Users,
  DollarSign,
  Wrench,
  ClipboardCheck,
  ClipboardList,
  ShoppingCart,
  UserCog,
  Eye,
  EyeOff,
  Star,
  StarOff,
} from 'lucide-react';
import { Card, CardBody, CardHeader, Empty, Button, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';

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
  // Auth
  'login.success':             { icon: LogIn,         label: 'ورود موفق',                  color: 'text-emerald-700' },
  'login.failed':              { icon: AlertTriangle,  label: 'ورود ناموفق',                 color: 'text-amber-700' },
  'login.blocked':             { icon: Shield,         label: 'بلاک شد',                     color: 'text-rose-700' },
  'logout':                    { icon: LogOut,         label: 'خروج',                         color: 'text-stone-500' },
  'password.changed':          { icon: Key,            label: 'تغییر رمز',                   color: 'text-blue-700' },
  // Transactions
  'transaction.approved':      { icon: CheckCircle2,   label: 'تایید تراکنش',                color: 'text-emerald-700' },
  'transaction.rejected':      { icon: XCircle,        label: 'رد تراکنش',                   color: 'text-rose-700' },
  'transaction.deleted':       { icon: Trash2,         label: 'حذف تراکنش',                  color: 'text-rose-700' },
  'transaction.nonFinancialEdit': { icon: Key,         label: 'ویرایش غیرمالی تراکنش',       color: 'text-blue-700' },
  'transaction.menuSaleDeduction.warning': { icon: AlertTriangle, label: 'هشدار کسر منو',   color: 'text-amber-700' },
  // Users
  'user.created':              { icon: UserPlus,       label: 'کاربر جدید',                  color: 'text-blue-700' },
  'user.deleted':              { icon: Trash2,         label: 'حذف کاربر',                   color: 'text-rose-700' },
  // Admin actions
  'admin.impersonation.started': { icon: Eye,          label: 'شروع جعل هویت (Admin)',        color: 'text-rose-700' },
  'admin.impersonation.ended':   { icon: EyeOff,       label: 'پایان جعل هویت (Admin)',       color: 'text-stone-500' },
  'admin.user.suspended':      { icon: UserX,          label: 'تعلیق کاربر توسط ادمین',      color: 'text-rose-700' },
  'admin.user.activated':      { icon: UserCheck,      label: 'فعال‌سازی کاربر توسط ادمین',   color: 'text-emerald-700' },
  'admin.user.roleChanged':    { icon: UserCog,        label: 'تغییر نقش کاربر',             color: 'text-blue-700' },
  'admin.user.branchChanged':  { icon: Users,          label: 'تغییر شعبه کاربر',            color: 'text-blue-700' },
  // Inventory
  'inv.produce':               { icon: Package,        label: 'تولید انبار',                  color: 'text-emerald-700' },
  'inv.stocktake':             { icon: ClipboardCheck, label: 'انبارگردانی',                  color: 'text-blue-700' },
  'inv.voucher.approved':      { icon: CheckCircle2,   label: 'تایید برگه انبار',             color: 'text-emerald-700' },
  'inv.voucher.rejected':      { icon: XCircle,        label: 'رد برگه انبار',                color: 'text-rose-700' },
  'inv.voucher.created':       { icon: Package,        label: 'ایجاد برگه انبار',             color: 'text-stone-600' },
  'inv.autoRecost.afterPurchase': { icon: RefreshCw,   label: 'بازمحاسبه بهای تمام‌شده',     color: 'text-blue-700' },
  'inventory_clamp_warning':   { icon: AlertTriangle,  label: 'هشدار محدودیت موجودی',        color: 'text-amber-700' },
  // Finance
  'reversal_created':          { icon: RotateCcw,      label: 'برگشت تراکنش',                color: 'text-amber-700' },
  'settings.factoryReset':     { icon: Skull,          label: 'بازنشانی کامل سیستم',         color: 'text-rose-700' },
  // Loyalty
  'loyalty.earn':              { icon: Star,           label: 'دریافت امتیاز وفاداری',       color: 'text-emerald-700' },
  'loyalty.redeem':            { icon: StarOff,        label: 'استفاده از امتیاز',           color: 'text-amber-700' },
  'loyalty.adjust':            { icon: DollarSign,     label: 'تعدیل امتیاز وفاداری',       color: 'text-blue-700' },
  // Equipment & Maintenance
  'equipment.created':         { icon: Wrench,         label: 'افزودن تجهیزات',              color: 'text-stone-600' },
  'equipment.updated':         { icon: Wrench,         label: 'ویرایش تجهیزات',              color: 'text-blue-700' },
  'equipment.deleted':         { icon: Trash2,         label: 'حذف تجهیزات',                 color: 'text-rose-700' },
  'maintenance.created':       { icon: Wrench,         label: 'ثبت تعمیر و نگهداری',         color: 'text-stone-600' },
  // Purchase Orders
  'po.created':                { icon: ShoppingCart,   label: 'سفارش خرید جدید',             color: 'text-stone-600' },
  'po.updated':                { icon: ShoppingCart,   label: 'ویرایش سفارش خرید',           color: 'text-blue-700' },
  'po.received':               { icon: CheckCircle2,   label: 'دریافت سفارش خرید',           color: 'text-emerald-700' },
  'po.receiveDiscrepancy':     { icon: AlertTriangle,  label: 'مغایرت در دریافت سفارش',      color: 'text-amber-700' },
  // Tasks
  'taskTemplate.created':      { icon: ClipboardList,  label: 'الگوی وظیفه جدید',            color: 'text-stone-600' },
  'taskTemplate.updated':      { icon: ClipboardList,  label: 'ویرایش الگوی وظیفه',          color: 'text-blue-700' },
  'task.generated':            { icon: ClipboardCheck, label: 'وظایف روز تولید شد',          color: 'text-stone-600' },
  'task.completed':            { icon: CheckCircle2,   label: 'وظیفه کامل شد',               color: 'text-emerald-700' },
  'task.skipped':              { icon: XCircle,        label: 'وظیفه رد شد',                 color: 'text-amber-700' },
  'task.assigned':             { icon: UserCog,        label: 'وظیفه تخصیص داده شد',         color: 'text-blue-700' },
  // Branches
  'branch.deleted':            { icon: Trash2,         label: 'حذف شعبه',                    color: 'text-rose-700' },
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
                      <span className="text-[11px] text-muted mr-2" dir="ltr">
                        {entry.ip}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted flex-shrink-0">
                    {formatted}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <DangerZone />
    </div>
  );
}

/* ============================================================================
 * DangerZone — عملیات بسیار خطرناک و غیرقابل بازگشت.
 * فقط SuperAdmin (همان gate سطح بالاتر cap="settings.security").
 * ========================================================================= */

const FACTORY_RESET_PHRASE = 'تایید حذف کل سیستم';

function DangerZone() {
  const showToast = useAppStore((s) => s.showToast);
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ truncatedTables: string[]; preserved: string[] } | null>(null);

  async function doFactoryReset() {
    if (phrase !== FACTORY_RESET_PHRASE) {
      showToast('عبارت تاییدی را دقیقاً مطابق متن بنویسید', 'danger');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/settings/wipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ target: 'factory_reset', confirmPhrase: phrase }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setResult({ truncatedTables: data.truncatedTables ?? [], preserved: data.preserved ?? [] });
      showToast('سامانه به تنظیمات کارخانه بازگشت — تمام داده‌ها پاک شد', 'danger');
      setOpen(false);
      setPhrase('');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'خطا در بازگشت به تنظیمات کارخانه', 'danger');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-rose-200">
      <CardHeader title="منطقهٔ خطر" sub="عملیات‌های زیر غیرقابل بازگشت هستند — با احتیاط کامل استفاده کنید" />
      <CardBody>
        <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 text-rose-600 mt-0.5">
              <Skull size={18} strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-rose-700">
                بازگشت به تنظیمات کارخانه (حذف کل اطلاعات سیستم)
              </div>
              <div className="text-[12px] text-rose-600/80 mt-1 leading-6">
                تمام داده‌های عملیاتی و اطلاعات پایه — تراکنش‌ها، انبار و دستور پخت‌ها، منو،
                مشتریان و وفاداری، رزروها، بازخوردها و... — برای همیشه پاک می‌شوند و سامانه
                به حالت کاملاً خالی بازمی‌گردد. <b>فقط</b> حساب‌های کاربری و شعب حفظ می‌شوند
                تا از سامانه بیرون نمانید.
              </div>
              <div className="mt-3">
                <Button variant="destructive" size="sm" icon={Skull} onClick={() => setOpen(true)}>
                  بازگشت به تنظیمات کارخانه (حذف کل اطلاعات سیستم)
                </Button>
              </div>
            </div>
          </div>
        </div>

        {open && (
          <div className="mt-4 rounded-lg border border-rose-300 bg-white p-4 space-y-3">
            <div className="text-[12.5px] text-stone-700">
              این عملیات قابل بازگشت نیست. برای تایید، عبارت زیر را دقیقاً (با همان حروف و فاصله‌ها) در کادر بنویسید:
            </div>
            <div className="text-[13px] font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2 select-all" dir="rtl">
              {FACTORY_RESET_PHRASE}
            </div>
            <Input
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder="عبارت تاییدی را اینجا بنویسید"
              dir="rtl"
            />
            <div className="flex items-center gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => { setOpen(false); setPhrase(''); }} disabled={busy}>
                انصراف
              </Button>
              <Button
                variant="destructive"
                size="sm"
                icon={Skull}
                onClick={doFactoryReset}
                disabled={busy || phrase !== FACTORY_RESET_PHRASE}
              >
                {busy ? 'در حال حذف کامل…' : 'تایید نهایی و حذف کل سیستم'}
              </Button>
            </div>
          </div>
        )}

        {result && (
          <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-4 text-[12px] text-stone-600 leading-6">
            <div className="font-medium text-stone-700 mb-1">سامانه بازنشانی شد.</div>
            <div>
              {result.truncatedTables.length} جدول پاک شد، و این موارد حفظ شدند: {result.preserved.join('، ')}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
