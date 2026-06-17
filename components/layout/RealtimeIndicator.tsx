'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { getSupabaseClient } from '@/lib/realtime/client';
import { cn } from '@/lib/utils';

/**
 * RealtimeIndicator — یک dot کوچک در header.
 *
 * سبز: Realtime متصل است (تغییرات فوری دریافت می‌شوند)
 * خاکستری: Realtime غیرفعال است (env vars ندارد یا قطع شده)
 *
 * اگر Supabase env vars نداشته باشید، این indicator نمایش داده نمی‌شود.
 * فقط وقتی قابلیت realtime فعال است نمایش داده می‌شود.
 */
export function RealtimeIndicator() {
  const [connected, setConnected] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return; // env vars نداریم

    setVisible(true);

    // بررسی وضعیت اتصال
    const channel = supabase.channel('ping');
    channel.subscribe((status) => {
      setConnected(status === 'SUBSCRIBED');
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      title={connected ? 'Real-time فعال' : 'در حال اتصال...'}
      className={cn(
        'flex items-center gap-1.5 text-[10.5px] px-2 py-1 rounded-full border transition-colors',
        connected
          ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
          : 'text-muted bg-stone-50 border-stone-200'
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          connected ? 'bg-emerald-500 animate-pulse' : 'bg-stone-300'
        )}
      />
      <span className="hidden sm:inline">
        {connected ? 'زنده' : 'قطع'}
      </span>
    </div>
  );
}
