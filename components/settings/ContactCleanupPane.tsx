'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, RefreshCw, Trash2, FolderInput, Lock, CheckCircle2,
} from 'lucide-react';
import { Button, Card, CardBody, CardHeader } from '@/components/ui';
import { fmt } from '@/lib/utils';
import type { ContactCleanupRow } from '@/app/api/admin/contact-cleanup/route';

type RowAction = 'confirming-delete' | 'confirming-convert' | null;

interface RowState {
  action: RowAction;
  loading: boolean;
  done: 'deleted' | 'converted' | null;
  error: string | null;
}

/**
 * ContactCleanupPane — ابزار موقت پاک‌سازی طرف‌حساب‌ها.
 *
 * ⚠ فقط SuperAdmin. بعد از پایان پاک‌سازی کاربر خبر می‌دهد
 * و این صفحه در یک commit جداگانه حذف یا پشت flag قرار می‌گیرد.
 *
 * منطق هر ردیف:
 * - balance≠0 → قفل با tooltip (مانده نسیه دارد)
 * - linked=0 و balance=0 → فقط «حذف» (delete واقعی)
 * - linked>0 و balance=0 → «تبدیل به دسته» (contactId→NULL، contact غیرفعال)
 * - «نگه‌دار» همیشه موجود است (هیچ اقدامی نمی‌کند)
 */
export function ContactCleanupPane() {
  const [contacts, setContacts] = useState<ContactCleanupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/admin/contact-cleanup', { credentials: 'include' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as { contacts: ContactCleanupRow[] };
      setContacts(data.contacts);
      setRowStates({});
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  function getRow(id: string): RowState {
    return rowStates[id] ?? { action: null, loading: false, done: null, error: null };
  }

  function setRow(id: string, patch: Partial<RowState>) {
    setRowStates(prev => ({ ...prev, [id]: { ...getRow(id), ...patch } }));
  }

  async function doAction(contact: ContactCleanupRow, action: 'delete' | 'convert') {
    setRow(contact.id, { loading: true, error: null, action: null });
    try {
      const res = await fetch(`/api/admin/contact-cleanup/${contact.id}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; action?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setRow(contact.id, {
        loading: false,
        done: action === 'delete' ? 'deleted' : 'converted',
        error: null,
      });
    } catch (e) {
      setRow(contact.id, {
        loading: false,
        error: e instanceof Error ? e.message : 'خطا',
        action: null,
      });
    }
  }

  const activeCount = contacts.filter(c => !getRow(c.id).done).length;
  const doneCount = contacts.filter(c => !!getRow(c.id).done).length;

  return (
    <div className="space-y-4">
      {/* هشدار موقت بودن ابزار */}
      <div className="flex items-start gap-3 p-3.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800">
        <AlertTriangle size={15} strokeWidth={1.5} className="flex-shrink-0 mt-0.5" />
        <div className="text-[12px] leading-6">
          این ابزار <strong>یک‌بار مصرف</strong> است. بعد از اتمام پاک‌سازی، به من خبر بده
          تا در یک commit جداگانه حذف شود و ابزار خطرناک دائمی نشود.
        </div>
      </div>

      <Card>
        <CardHeader
          title="پاک‌سازی طرف‌حساب‌ها"
          sub={
            loading
              ? 'در حال بارگذاری...'
              : `${contacts.length} طرف‌حساب · ${activeCount} باقی‌مانده · ${doneCount} پردازش‌شده`
          }
          action={
            <Button variant="ghost" size="sm" icon={RefreshCw} onClick={fetchContacts} disabled={loading}>
              بازخوانی
            </Button>
          }
        />
        <CardBody className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-stone-100 rounded animate-pulse" />
              ))}
            </div>
          ) : fetchError ? (
            <div className="p-4 text-[12px] text-rose-700">{fetchError}</div>
          ) : contacts.length === 0 ? (
            <div className="p-6 text-center text-[12px] text-muted">طرف‌حسابی برای نمایش وجود ندارد.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-stone-50/70 border-b border-stone-100">
                  <tr>
                    <th className="text-right text-[11px] text-stone-500 font-normal px-4 py-3">نام</th>
                    <th className="text-right text-[11px] text-stone-500 font-normal px-3 py-3">نوع</th>
                    <th className="text-center text-[11px] text-stone-500 font-normal px-3 py-3">تراکنش</th>
                    <th className="text-end text-[11px] text-stone-500 font-normal px-3 py-3">مانده</th>
                    <th className="text-right text-[11px] text-stone-500 font-normal px-3 py-3">آخرین تراکنش</th>
                    <th className="text-right text-[11px] text-stone-500 font-normal px-4 py-3">اقدام</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map(c => (
                    <ContactRow
                      key={c.id}
                      contact={c}
                      state={getRow(c.id)}
                      onSetAction={(a) => setRow(c.id, { action: a, error: null })}
                      onConfirm={(action) => doAction(c, action)}
                      onCancel={() => setRow(c.id, { action: null })}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* راهنما */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            color: 'bg-rose-50 border-rose-200 text-rose-800',
            title: 'حذف',
            desc: 'فقط اگر هیچ تراکنشی ندارد و مانده صفر است. حذف دائمی.',
          },
          {
            color: 'bg-sky-50 border-sky-200 text-sky-800',
            title: 'تبدیل به دسته',
            desc: 'contactId تراکنش‌ها NULL می‌شود. اگر categoryName خالی بود، نام طرف‌حساب جایگزین می‌شود. contact غیرفعال.',
          },
          {
            color: 'bg-stone-50 border-stone-200 text-stone-600',
            title: 'نگه‌دار',
            desc: 'هیچ تغییری ایجاد نمی‌شود. طرف‌حساب واقعی است و باید باقی بماند.',
          },
        ].map(item => (
          <div key={item.title} className={`text-[11.5px] p-3 rounded-md border ${item.color}`}>
            <strong>{item.title}:</strong> {item.desc}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ردیف جدول
// ─────────────────────────────────────────────────────────────────

interface ContactRowProps {
  contact: ContactCleanupRow;
  state: RowState;
  onSetAction: (a: RowAction) => void;
  onConfirm: (action: 'delete' | 'convert') => void;
  onCancel: () => void;
}

function ContactRow({ contact: c, state, onSetAction, onConfirm, onCancel }: ContactRowProps) {
  const isLocked = c.balance !== 0;
  const canDelete = !isLocked && c.linkedTxCount === 0;
  const canConvert = !isLocked && c.linkedTxCount > 0;

  if (state.done) {
    return (
      <tr className="border-b border-stone-50 bg-stone-50/40">
        <td colSpan={6} className="px-4 py-3">
          <div className="flex items-center gap-2 text-[12px] text-stone-500">
            <CheckCircle2 size={13} strokeWidth={1.5} className="text-emerald-600" />
            <span className="font-medium text-stone-700">{c.name}</span>
            <span>—</span>
            <span>{state.done === 'deleted' ? 'حذف شد' : `تبدیل به دسته شد (${c.linkedTxCount} تراکنش)`}</span>
          </div>
        </td>
      </tr>
    );
  }

  const lastDate = c.lastTxDate
    ? new Date(c.lastTxDate).toLocaleDateString('fa-IR')
    : '—';

  return (
    <tr className="border-b border-stone-50 last:border-b-0 hover:bg-stone-50/50">
      <td className="px-4 py-3">
        <div className="text-[12.5px] text-stone-900 font-medium">{c.name}</div>
        {c.phone && <div className="text-[10.5px] text-muted">{c.phone}</div>}
      </td>
      <td className="px-3 py-3">
        <span className="text-[11px] text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
          {c.type}
        </span>
      </td>
      <td className="px-3 py-3 text-center">
        <span className="text-[12.5px] tabular-nums text-stone-700">{c.linkedTxCount}</span>
      </td>
      <td className="px-3 py-3 text-end">
        <span className={`text-[12.5px] tabular-nums font-medium ${c.balance !== 0 ? 'text-rose-700' : 'text-stone-400'}`}>
          {c.balance !== 0 ? fmt(Math.abs(c.balance)) : '—'}
        </span>
      </td>
      <td className="px-3 py-3">
        <span className="text-[11.5px] text-muted">{lastDate}</span>
      </td>
      <td className="px-4 py-3">
        {state.error && (
          <div className="text-[11px] text-rose-700 mb-1">{state.error}</div>
        )}

        {isLocked ? (
          <div
            title="مانده‌ی نسیه دارد — اول تسویه"
            className="inline-flex items-center gap-1.5 text-[11px] text-stone-400 cursor-not-allowed"
          >
            <Lock size={11} strokeWidth={1.5} />
            قفل
          </div>
        ) : state.action === 'confirming-delete' ? (
          <div className="flex items-center gap-1.5">
            <Button
              variant="destructive"
              size="sm"
              loading={state.loading}
              onClick={() => onConfirm('delete')}
            >
              مطمئنم — حذف کن
            </Button>
            <Button variant="default" size="sm" disabled={state.loading} onClick={onCancel}>
              لغو
            </Button>
          </div>
        ) : state.action === 'confirming-convert' ? (
          <div className="flex items-center gap-1.5">
            <Button
              variant="primary"
              size="sm"
              loading={state.loading}
              onClick={() => onConfirm('convert')}
            >
              تأیید — تبدیل کن
            </Button>
            <Button variant="default" size="sm" disabled={state.loading} onClick={onCancel}>
              لغو
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                icon={Trash2}
                onClick={() => onSetAction('confirming-delete')}
                className="text-rose-600 hover:bg-rose-50"
              >
                حذف
              </Button>
            )}
            {canConvert && (
              <Button
                variant="ghost"
                size="sm"
                icon={FolderInput}
                onClick={() => onSetAction('confirming-convert')}
                className="text-sky-700 hover:bg-sky-50"
              >
                تبدیل به دسته
              </Button>
            )}
            <span className="text-[11px] text-stone-300 select-none">نگه‌دار</span>
          </div>
        )}
      </td>
    </tr>
  );
}
