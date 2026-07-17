'use client';

import { useEffect, useState, useCallback } from 'react';
import { Lock, LockOpen, AlertTriangle, Loader2, ShieldAlert, CalendarDays, Check } from 'lucide-react';
import { getTodayJalali } from '@/lib/jalali';

// ── Types ────────────────────────────────────────────────────────
interface FinancialPeriod {
  id: string;
  jalaliYear: number;
  jalaliMonth: number;
  closedAt: string;
  closedBy: string;
}

// ── Constants ────────────────────────────────────────────────────
const MONTH_NAMES = [
  '', 'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

function parseCurrentJalali(): { year: number; month: number } {
  const s = getTodayJalali().replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0));
  const [y, m] = s.split('/');
  return {
    year: parseInt(y ?? '1404', 10),
    month: parseInt(m ?? '1', 10),
  };
}

function formatClosedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fa-IR', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ── Main Page ────────────────────────────────────────────────────
export default function FinancialPeriodsPage() {
  const today = parseCurrentJalali();

  const [periods, setPeriods] = useState<FinancialPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Close form state
  const [selYear, setSelYear]     = useState(today.year);
  const [selMonth, setSelMonth]   = useState(today.month);
  const [closing, setClosing]     = useState(false);
  const [closeMsg, setCloseMsg]   = useState<{ ok: boolean; text: string } | null>(null);

  // Reopen state
  const [reopening, setReopening] = useState<string | null>(null); // "year-month" key

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch('/api/financial-periods');
      const data = await res.json() as { periods?: FinancialPeriod[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'خطا در بارگذاری');
      setPeriods(data.periods ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطای ناشناخته');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function closePeriod() {
    setClosing(true);
    setCloseMsg(null);
    try {
      const res  = await fetch('/api/financial-periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jalaliYear: selYear, jalaliMonth: selMonth }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'خطا');
      setCloseMsg({ ok: true, text: `دوره‌ی ${MONTH_NAMES[selMonth]} ${selYear} بسته شد.` });
      await load();
    } catch (e) {
      setCloseMsg({ ok: false, text: e instanceof Error ? e.message : 'خطای ناشناخته' });
    } finally {
      setClosing(false);
    }
  }

  async function reopenPeriod(year: number, month: number) {
    const key = `${year}-${month}`;
    if (!confirm(`دوره‌ی ${MONTH_NAMES[month]} ${year} بازگشایی شود؟\nتراکنش‌های این ماه دوباره قابل ویرایش می‌شوند.`))
      return;
    setReopening(key);
    try {
      const res  = await fetch(`/api/financial-periods?year=${year}&month=${month}`, { method: 'DELETE' });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'خطا');
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'خطا در بازگشایی');
    } finally {
      setReopening(null);
    }
  }

  const isClosed = (year: number, month: number) =>
    periods.some((p) => p.jalaliYear === year && p.jalaliMonth === month);

  const yearOptions = Array.from({ length: 11 }, (_, i) => 1400 + i);

  return (
    <div className="max-w-2xl space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-stone-100 flex items-center gap-2">
          <CalendarDays size={20} className="text-indigo-400" />
          مدیریت دوره‌های مالی
        </h1>
        <p className="text-sm text-stone-400 mt-1">
          بستن یک دوره‌ی مالی از ویرایش یا حذف تراکنش‌های آن ماه جلوگیری می‌کند.
        </p>
      </div>

      {/* Warning card */}
      <div className="flex gap-3 bg-amber-950/40 border border-amber-700/40 rounded-xl px-4 py-3.5">
        <ShieldAlert size={18} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="text-[12.5px] text-amber-200/80 leading-relaxed space-y-1">
          <p className="font-medium text-amber-300">تأثیر بستن دوره</p>
          <p>هر تراکنش تأیید‌شده‌ای که تاریخ آن در ماه بسته‌شده باشد، دیگر قابل ویرایش یا حذف نیست و خطای ۴۲۲ برمی‌گردد.</p>
          <p>برای اصلاح، ابتدا باید دوره را بازگشایی کنید — بازگشایی نیز در لاگ ادیت ثبت نمی‌شود، مراقب باشید.</p>
        </div>
      </div>

      {/* Close period form */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-800">
          <h2 className="text-[14px] font-semibold text-stone-100 flex items-center gap-2">
            <Lock size={14} className="text-red-400" />
            بستن دوره‌ی مالی جدید
          </h2>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            {/* Year */}
            <div className="flex-1">
              <label className="block text-[11.5px] text-stone-400 mb-1.5">سال شمسی</label>
              <select
                value={selYear}
                onChange={(e) => setSelYear(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 text-[13px] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Month */}
            <div className="flex-1">
              <label className="block text-[11.5px] text-stone-400 mb-1.5">ماه شمسی</label>
              <select
                value={selMonth}
                onChange={(e) => setSelMonth(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 text-[13px] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
              >
                {MONTH_NAMES.slice(1).map((name, i) => (
                  <option key={i + 1} value={i + 1}>{name}</option>
                ))}
              </select>
            </div>

            {/* Action button */}
            <button
              onClick={closePeriod}
              disabled={closing || isClosed(selYear, selMonth)}
              className="h-10 px-5 rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] font-medium flex items-center gap-2 transition-colors shrink-0"
            >
              {closing ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
              {isClosed(selYear, selMonth) ? 'قبلاً بسته شده' : 'بستن دوره'}
            </button>
          </div>

          {/* Feedback */}
          {closeMsg && (
            <div className={`flex items-center gap-2 text-[12.5px] px-3 py-2 rounded-lg ${
              closeMsg.ok
                ? 'bg-emerald-950/50 border border-emerald-700/40 text-emerald-300'
                : 'bg-red-950/50 border border-red-700/40 text-red-300'
            }`}>
              {closeMsg.ok
                ? <Check size={14} className="shrink-0" />
                : <AlertTriangle size={14} className="shrink-0" />}
              {closeMsg.text}
            </div>
          )}
        </div>
      </div>

      {/* Closed periods list */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-stone-100 flex items-center gap-2">
            <Lock size={14} className="text-stone-400" />
            دوره‌های بسته‌شده
            {!loading && (
              <span className="text-[11px] text-stone-500 font-normal">
                ({periods.length} دوره)
              </span>
            )}
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={22} className="animate-spin text-stone-600" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 px-5 py-5 text-[13px] text-red-400">
            <AlertTriangle size={15} /> {error}
          </div>
        ) : periods.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-stone-500">
            <LockOpen size={28} strokeWidth={1.5} />
            <p className="text-[13px]">هیچ دوره‌ای بسته نشده است</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-800/60">
            {[...periods].reverse().map((p) => {
              const key = `${p.jalaliYear}-${p.jalaliMonth}`;
              const isReopening = reopening === key;
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-stone-800/30 transition-colors"
                >
                  {/* Period label */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-950/50 border border-red-800/40 flex items-center justify-center">
                      <Lock size={13} className="text-red-400" />
                    </div>
                    <div>
                      <p className="text-[13.5px] font-medium text-stone-100">
                        {MONTH_NAMES[p.jalaliMonth]} {p.jalaliYear}
                      </p>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        بسته‌شده در {formatClosedAt(p.closedAt)}
                      </p>
                    </div>
                  </div>

                  {/* Reopen button */}
                  <button
                    onClick={() => reopenPeriod(p.jalaliYear, p.jalaliMonth)}
                    disabled={isReopening}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-stone-700 text-stone-400 hover:border-amber-500/60 hover:text-amber-400 text-[12px] transition-colors disabled:opacity-50"
                    title="بازگشایی دوره"
                  >
                    {isReopening
                      ? <Loader2 size={12} className="animate-spin" />
                      : <LockOpen size={12} />}
                    بازگشایی
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
