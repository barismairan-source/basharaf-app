'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Printer, RefreshCw, Settings as SettingsIcon, Store } from 'lucide-react';
import { Button, Chip, Empty, Select, Toggle } from '@/components/ui';
import { useAppStore } from '@/store';
import { fmt, toFa } from '@/lib/utils';
import { formatTehranTime, getTodayJalali } from '@/lib/jalali';
import { orderingRepo } from '@/lib/repos/ordering.api';
import { useOrdersRealtime } from '@/lib/realtime/useOrdersRealtime';
import { playOrderAlert } from '@/lib/ordering/alertSound';
import {
  BOARD_COLUMNS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONES,
  ORDER_TRANSITION_LABELS,
  TERMINAL_STATUSES,
  getValidTransitions,
} from '@/lib/ordering/orderStatus';
import type { BoardOrder, OrderStatus } from '@/types';

type ViewFilter = 'open' | 'today';

const VIEW_OPTIONS: ReadonlyArray<{ value: ViewFilter; label: string }> = [
  { value: 'open', label: 'باز' },
  { value: 'today', label: 'امروز' },
];

export default function OrdersBoardPage() {
  const user = useAppStore((s) => s.user);
  const branches = useAppStore((s) => s.branches);
  const showToast = useAppStore((s) => s.showToast);

  const [hydrated, setHydrated] = useState(false);
  const [branchId, setBranchId] = useState('');
  const [viewFilter, setViewFilter] = useState<ViewFilter>('open');
  const [orders, setOrders] = useState<BoardOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [printOrder, setPrintOrder] = useState<BoardOrder | null>(null);

  useEffect(() => { setHydrated(true); }, []);

  const effectiveBranchId = user?.role === 'BranchUser' ? user.assignedBranch : branchId || undefined;

  const loadOrders = useCallback(() => {
    setLoading(true);
    orderingRepo
      .listOrders(effectiveBranchId)
      .then(setOrders)
      .catch(() => showToast('خطا در بارگذاری سفارش‌ها', 'danger'))
      .finally(() => setLoading(false));
  }, [effectiveBranchId, showToast]);

  useEffect(() => {
    if (!hydrated || !user || user.role === 'Warehouse') return;
    loadOrders();
  }, [hydrated, user, loadOrders]);

  useOrdersRealtime({
    branchFilter: effectiveBranchId ?? null,
    onInsert: () => {
      playOrderAlert();
      showToast('سفارش جدید ثبت شد', 'success');
      loadOrders();
    },
    onUpdate: (row) => {
      setOrders((prev) => prev.map((o) => (o.id === row.id ? { ...o, status: row.status } : o)));
    },
  });

  // چاپ — یک‌بار رندر بخش print:block و فراخوانی window.print
  useEffect(() => {
    if (!printOrder) return;
    const t = setTimeout(() => window.print(), 50);
    return () => clearTimeout(t);
  }, [printOrder]);

  useEffect(() => {
    function onAfterPrint() { setPrintOrder(null); }
    window.addEventListener('afterprint', onAfterPrint);
    return () => window.removeEventListener('afterprint', onAfterPrint);
  }, []);

  async function handleTransition(order: BoardOrder, toStatus: OrderStatus) {
    if (toStatus === 'cancelled' || toStatus === 'rejected') {
      const label = ORDER_TRANSITION_LABELS[toStatus] ?? ORDER_STATUS_LABELS[toStatus];
      if (!confirm(`${label} سفارش «${toFa(order.orderNo)}»؟`)) return;
    }
    setUpdatingId(order.id);
    try {
      const updated = await orderingRepo.updateOrderStatus(order.id, toStatus);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    } catch (e) {
      showToast((e as Error).message, 'danger');
    } finally {
      setUpdatingId(null);
    }
  }

  if (!hydrated || !user) {
    return <div className="p-6"><div className="h-96 bg-stone-100 rounded-lg animate-pulse" /></div>;
  }

  if (user.role === 'Warehouse') {
    return (
      <div className="p-6">
        <Empty title="شما به این بخش دسترسی ندارید" />
      </div>
    );
  }

  const todayJalali = getTodayJalali();
  const visibleOrders =
    viewFilter === 'today'
      ? orders.filter((o) => o.jalaliDate === todayJalali)
      : orders.filter((o) => !TERMINAL_STATUSES.includes(o.status));

  const showBranchName = user.role === 'SuperAdmin';

  return (
    <div className="p-4 lg:p-6 print:p-0">
      <div className="print:hidden space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[20px] font-medium text-stone-900 tracking-tight">سفارش‌های بیرون‌بر</h1>
            <div className="text-[12px] text-stone-500 mt-1">{toFa(visibleOrders.length)} سفارش</div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {user.role === 'SuperAdmin' && (
              <Select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="w-40">
                <option value="">همه‌ی شعب</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </Select>
            )}
            <Toggle value={viewFilter} onChange={setViewFilter} options={VIEW_OPTIONS} />
            <Button variant="default" size="sm" icon={RefreshCw} onClick={loadOrders} loading={loading}>
              به‌روزرسانی
            </Button>
            <Link href="/orders/settings">
              <Button variant="default" size="sm" icon={SettingsIcon}>تنظیمات سفارش</Button>
            </Link>
          </div>
        </div>

        {/* Kanban */}
        <div className="flex gap-3 overflow-x-auto pb-2">
          {BOARD_COLUMNS.map((col) => {
            const colOrders = visibleOrders.filter((o) => col.statuses.includes(o.status));
            return (
              <div key={col.key} className="flex-shrink-0 w-[300px] flex flex-col">
                <div className="flex items-center justify-between px-1 mb-2">
                  <h2 className="text-[13px] text-stone-600 font-medium">{col.label}</h2>
                  <span className="text-[11px] text-muted tabular-nums">{toFa(colOrders.length)}</span>
                </div>
                <div className="space-y-2 min-h-[60px]">
                  {colOrders.length === 0 && (
                    <div className="text-[11.5px] text-muted text-center py-4 border border-dashed border-stone-200 rounded-lg">—</div>
                  )}
                  {colOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      showBranchName={showBranchName}
                      updating={updatingId === order.id}
                      onTransition={(to) => handleTransition(order, to)}
                      onPrint={() => setPrintOrder(order)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Print receipt */}
      {printOrder && <PrintReceipt order={printOrder} />}
    </div>
  );
}

function OrderCard({
  order, showBranchName, updating, onTransition, onPrint,
}: {
  order: BoardOrder;
  showBranchName: boolean;
  updating: boolean;
  onTransition: (to: OrderStatus) => void;
  onPrint: () => void;
}) {
  const transitions = getValidTransitions(order.status, order.serviceType);
  const statusTone = ORDER_STATUS_TONES[order.status];

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-3 space-y-2 text-[12.5px]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-stone-800 font-medium truncate">#{toFa(order.orderNo)}</span>
          <Chip tone={statusTone}>{ORDER_STATUS_LABELS[order.status]}</Chip>
        </div>
        <span className="text-muted text-[11px] tabular-nums flex-shrink-0">{formatTehranTime(order.createdAt)}</span>
      </div>

      {showBranchName && (
        <div className="flex items-center gap-1 text-stone-500 text-[11.5px]">
          <Store size={11} strokeWidth={1.5} />
          {order.branchName}
        </div>
      )}

      <div className="flex items-center gap-2 text-stone-600">
        <Chip tone="neutral">{order.serviceType === 'delivery' ? 'ارسال' : 'دریافت حضوری'}</Chip>
        <span className="truncate">{order.customerName}</span>
        <span dir="ltr" className="text-muted text-[11.5px]">{order.customerPhone}</span>
      </div>

      {order.serviceType === 'delivery' && order.address && (
        <p className="text-stone-500 text-[11.5px] leading-relaxed">
          {order.zoneName && <span className="text-stone-600">{order.zoneName} — </span>}
          {order.address}
        </p>
      )}
      {order.serviceType === 'pickup' && order.pickupTime && (
        <p className="text-stone-500 text-[11.5px]">زمان دریافت: {toFa(order.pickupTime)}</p>
      )}

      <div className="border-t border-stone-100 pt-2 space-y-0.5">
        {order.lines.map((line, i) => (
          <div key={i} className="flex items-center justify-between text-stone-600">
            <span className="truncate">{line.itemName} <span className="text-muted">× {toFa(line.qty)}</span></span>
            <span className="text-stone-700 flex-shrink-0">{fmt(line.lineTotal)}</span>
          </div>
        ))}
      </div>

      {order.note && (
        <p className="text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1 text-[11.5px]">{order.note}</p>
      )}

      <div className="flex items-center justify-between border-t border-stone-100 pt-2">
        <span className="text-stone-800 font-medium">{fmt(order.total)} تومان</span>
        <button
          type="button"
          onClick={onPrint}
          title="چاپ"
          className="flex items-center gap-1 h-7 px-2 rounded-md border border-stone-200 text-[11.5px] text-stone-600 hover:bg-stone-50 transition-colors"
        >
          <Printer size={12} strokeWidth={1.5} />
          چاپ
        </button>
      </div>

      {transitions.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          {transitions.map((to) => (
            <Button
              key={to}
              size="sm"
              variant={to === 'cancelled' || to === 'rejected' ? 'danger' : 'primary'}
              disabled={updating}
              onClick={() => onTransition(to)}
            >
              {ORDER_TRANSITION_LABELS[to] ?? ORDER_STATUS_LABELS[to]}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function PrintReceipt({ order }: { order: BoardOrder }) {
  return (
    <div className="hidden print:block p-6 text-black" dir="rtl">
      <h1 className="text-xl font-bold mb-1">با شرف{order.branchName ? ` — ${order.branchName}` : ''}</h1>
      <p className="text-sm text-gray-700 mb-3">
        سفارش #{toFa(order.orderNo)} — {order.serviceType === 'delivery' ? 'ارسال' : 'دریافت حضوری'} — {formatTehranTime(order.createdAt)}
      </p>

      <div className="text-sm mb-3 space-y-1">
        <div>مشتری: {order.customerName} — <span dir="ltr">{order.customerPhone}</span></div>
        {order.serviceType === 'delivery' && order.address && (
          <div>آدرس: {order.zoneName ? `${order.zoneName} — ` : ''}{order.address}</div>
        )}
        {order.serviceType === 'pickup' && order.pickupTime && (
          <div>زمان دریافت: {toFa(order.pickupTime)}</div>
        )}
        {order.note && <div>یادداشت: {order.note}</div>}
      </div>

      <table className="w-full text-sm border-t border-b border-gray-300 mb-3">
        <tbody>
          {order.lines.map((line, i) => (
            <tr key={i} className="border-b border-gray-200">
              <td className="py-1">{line.itemName}</td>
              <td className="py-1 text-center">× {toFa(line.qty)}</td>
              <td className="py-1 text-left">{fmt(line.lineTotal)} تومان</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-sm space-y-1">
        <div className="flex justify-between"><span>جمع اقلام</span><span>{fmt(order.subtotal)} تومان</span></div>
        {order.deliveryFee > 0 && (
          <div className="flex justify-between"><span>هزینه‌ی ارسال</span><span>{fmt(order.deliveryFee)} تومان</span></div>
        )}
        {order.discount > 0 && (
          <div className="flex justify-between"><span>تخفیف</span><span>−{fmt(order.discount)} تومان</span></div>
        )}
        <div className="flex justify-between font-bold text-base border-t border-gray-300 pt-1">
          <span>مبلغ کل</span><span>{fmt(order.total)} تومان</span>
        </div>
      </div>
    </div>
  );
}
