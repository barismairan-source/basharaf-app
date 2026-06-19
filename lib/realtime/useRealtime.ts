'use client';

import { useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from './client';
import { useAppStore } from '@/store';
import type { Transaction, Notification, Account } from '@/types';

/**
 * useRealtime — فاز ۱۴ + ۱۷.
 *
 * Subscribe به:
 * 1. transactions — INSERT/UPDATE/DELETE
 * 2. notifications — INSERT (فقط برای این کاربر)
 * 3. accounts — UPDATE (موجودی real-time آپدیت می‌شود)
 */
export function useRealtime() {
  const user = useAppStore(s => s.user);
  const showToast = useAppStore(s => s.showToast);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!user) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel('basharaf-realtime-v2')

      // ─── Transactions ──────────────────────────────────────────
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, (payload) => {
        const tx = dbRowToTransaction(payload.new as Record<string, unknown>);
        if (!tx) return;
        if (user.role === 'BranchUser' && tx.branchId !== user.assignedBranch) return;

        const current = useAppStore.getState().transactions;
        if (current.some(t => t.id === tx.id || t.id.startsWith('optimistic-'))) return;

        useAppStore.setState(s => ({ transactions: [tx, ...s.transactions] }));
        if (tx.createdBy !== user.id) {
          showToast('تراکنش جدید ثبت شد', 'success', tx.title);
        }
      })

      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'transactions' }, (payload) => {
        const tx = dbRowToTransaction(payload.new as Record<string, unknown>);
        if (!tx) return;
        if (user.role === 'BranchUser' && tx.branchId !== user.assignedBranch) return;

        const existing = useAppStore.getState().transactions.find(t => t.id === tx.id);
        if (existing && existing.status !== tx.status) {
          const msg = tx.status === 'approved' ? 'تراکنش تایید شد ✓' : tx.status === 'rejected' ? 'تراکنش رد شد' : null;
          if (msg && tx.createdBy === user.id) {
            showToast(msg, tx.status === 'approved' ? 'success' : 'danger', tx.title);
          }
        }

        useAppStore.setState(s => ({
          transactions: s.transactions.map(t => t.id === tx.id ? tx : t),
        }));
      })

      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'transactions' }, (payload) => {
        const id = (payload.old as Record<string, unknown>).id as string;
        if (!id) return;
        useAppStore.setState(s => ({
          transactions: s.transactions.filter(t => t.id !== id),
          openTxId: s.openTxId === id ? null : s.openTxId,
        }));
      })

      // ─── Notifications ─────────────────────────────────────────
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const notif: Notification = {
            id: row.id as string,
            type: row.type as Notification['type'],
            title: row.title as string,
            sub: row.sub as string,
            time: row.time as string,
            read: row.read as boolean,
            txId: (row.tx_id as string) ?? null,
          };
          const current = useAppStore.getState().notifications;
          if (current.some(n => n.id === notif.id)) return;
          useAppStore.setState(s => ({ notifications: [notif, ...s.notifications] }));
        }
      )

      // ─── Accounts (موجودی real-time) ───────────────────────────
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'accounts' }, (payload) => {
        const row = payload.new as Record<string, unknown>;
        const id = row.id as string;
        const balance = Number(row.balance ?? 0);

        useAppStore.setState(s => ({
          accounts: s.accounts.map(a =>
            a.id === id ? { ...a, balance, updatedAt: String(row.updated_at ?? a.updatedAt) } : a
          ),
        }));
      })

      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'accounts' }, (payload) => {
        const row = payload.new as Record<string, unknown>;
        const account: Account = {
          id: row.id as string,
          name: row.name as string,
          type: row.type as string,
          balance: Number(row.balance ?? 0),
          isActive: row.is_active as boolean,
          branchId: (row.branch_id as string) ?? null,
          createdAt: String(row.created_at),
          updatedAt: String(row.updated_at),
        };
        const current = useAppStore.getState().accounts;
        if (current.some(a => a.id === account.id)) return;
        useAppStore.setState(s => ({ accounts: [...s.accounts, account] }));
      })

      .subscribe(status => {
        if (process.env.NODE_ENV !== 'production') {
          console.log('[Realtime]', status);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id]);
}

// ─── Helper: DB row → Transaction ──────────────────────────────────
function dbRowToTransaction(row: Record<string, unknown>): Transaction | null {
  try {
    const base = {
      id: row.id as string,
      type: row.type as 'income' | 'expense' | 'transfer',
      title: row.title as string,
      category: (row.category_id as string) ?? '',
      categoryName: (row.category_name as string) ?? '',
      amount: Number(row.amount ?? 0),
      payee: row.payee as string,
      branchId: row.branch_id as string,
      branch: row.branch_name as string,
      method: row.method as string,
      receipt: (row.receipt as string) ?? '—',
      receiptUrl: (row.receipt_url as string) ?? null,
      date: row.date as string,
      note: (row.note as string) ?? '',
      hasReceipt: Boolean(row.has_receipt),
      invoiceCode: (row.invoice_code as string) ?? null,
      createdBy: row.created_by as string,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };

    const status = row.status as string;
    if (status === 'approved') {
      return { ...base, status: 'approved', approvedBy: (row.approved_by as string) ?? '', approvedAt: String(row.approved_at ?? row.updated_at) };
    }
    if (status === 'rejected') {
      return { ...base, status: 'rejected', rejectedBy: (row.rejected_by as string) ?? '', rejectedAt: String(row.rejected_at ?? row.updated_at), rejectionReason: (row.rejection_reason as string) ?? 'بدون دلیل' };
    }
    if (status === 'proforma') {
      return { ...base, status: 'proforma' };
    }
    return { ...base, status: 'pending' };
  } catch {
    return null;
  }
}
