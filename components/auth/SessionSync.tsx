'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store';
import { useRealtime } from '@/lib/realtime/useRealtime';

/**
 * SessionSync — فاز ۱۴.
 *
 * در فاز ۱۰: bootstrap + polling هر ۳۰ ثانیه.
 * در فاز ۱۴: bootstrap + Realtime subscription (polling را حذف کردیم).
 *
 * Realtime جایگزین polling می‌شود:
 * - polling: هر ۳۰ ثانیه همه data را refetch → network overhead
 * - Realtime: فقط تغییرات push می‌شوند → سریع‌تر و کم‌مصرف‌تر
 *
 * اگر Realtime env vars نباشند، سیستم gracefully به بدون realtime
 * fallback می‌کند (همان رفتار فاز ۱۰).
 */
export function SessionSync() {
  const bootstrap = useAppStore((s) => s.bootstrap);
  const bootstrapped = useAppStore((s) => s.bootstrapped);
  const user = useAppStore((s) => s.user);
  const logout = useAppStore((s) => s.logout);
  const hasBootstrappedOnce = useRef(false);

  // bootstrap یک بار در mount
  useEffect(() => {
    if (hasBootstrappedOnce.current) return;
    hasBootstrappedOnce.current = true;
    bootstrap();
  }, [bootstrap]);

  // Cross-tab logout
  useEffect(() => {
    if (typeof window === 'undefined') return;
    function handleStorage(e: StorageEvent) {
      if (e.key === 'basharaf-logout-signal') logout();
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [logout]);

  // Realtime subscription (فاز ۱۴)
  // این hook خودش null check دارد — اگر env vars نباشند، no-op
  useRealtime();

  return null;
}
