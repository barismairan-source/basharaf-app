'use client';

import { useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from './client';
import { useAppStore } from '@/store';
import type { OrderStatus } from '@/types';

export interface OrdersRealtimeRow {
  id: string;
  branchId: string;
  status: OrderStatus;
}

interface UseOrdersRealtimeOptions {
  /** شعبه‌ی انتخاب‌شده در فیلتر (SuperAdmin) — null یعنی همه‌ی شعب. */
  branchFilter: string | null;
  onInsert: (row: OrdersRealtimeRow) => void;
  onUpdate: (row: OrdersRealtimeRow) => void;
}

/**
 * Realtime برای تخته‌ی عملیاتی /orders — subscribe روی insert/update جدول
 * orders، با scope شعبه:
 * - BranchUser: فقط سفارش‌های شعبه‌ی خودش.
 * - SuperAdmin: طبق branchFilter (یا همه‌ی شعب اگر فیلتری انتخاب نشده).
 */
export function useOrdersRealtime({ branchFilter, onInsert, onUpdate }: UseOrdersRealtimeOptions) {
  const user = useAppStore((s) => s.user);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onInsertRef = useRef(onInsert);
  const onUpdateRef = useRef(onUpdate);
  onInsertRef.current = onInsert;
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const currentUser = user;
    if (!currentUser) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    function inScope(branchId: string): boolean {
      if (currentUser!.role === 'BranchUser') return branchId === currentUser!.assignedBranch;
      if (branchFilter) return branchId === branchFilter;
      return true;
    }

    function toRow(payload: Record<string, unknown>): OrdersRealtimeRow {
      return {
        id: payload.id as string,
        branchId: payload.branch_id as string,
        status: payload.status as OrderStatus,
      };
    }

    const channel = supabase
      .channel('basharaf-orders-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        const row = toRow(payload.new as Record<string, unknown>);
        if (!inScope(row.branchId)) return;
        onInsertRef.current(row);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        const row = toRow(payload.new as Record<string, unknown>);
        if (!inScope(row.branchId)) return;
        onUpdateRef.current(row);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, branchFilter]);
}
