'use client';

import { useEffect, useState } from 'react';
import { Switch } from '@/components/ui';
import {
  getPushSupportStatus,
  getExistingSubscription,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push/subscribeToPush';

/**
 * PushNotificationToggle — opt-in برای نوتیفیکیشن مرورگر (Web Push).
 *
 * برخلاف سایر ToggleRowها در این صفحه، این یکی state واقعی مرورگر
 * (permission + subscription) را می‌خواند/می‌نویسد، نه صرفاً یک preference
 * محلی — پس منطق async و حالت‌های خطا/عدم پشتیبانی مستقل از الگوی
 * ToggleRow پیاده شده است.
 */
export function PushNotificationToggle() {
  const [status, setStatus] = useState<'loading' | 'unsupported' | 'off' | 'on' | 'denied'>('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const support = getPushSupportStatus();
    if (support === 'unsupported') {
      setStatus('unsupported');
      return;
    }
    if (support === 'denied') {
      setStatus('denied');
      return;
    }
    getExistingSubscription().then((sub) => setStatus(sub ? 'on' : 'off'));
  }, []);

  async function handleToggle(next: boolean) {
    setError(null);
    setBusy(true);
    try {
      if (next) {
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          throw new Error('نوتیفیکیشن هنوز روی این سامانه پیکربندی نشده');
        }
        await subscribeToPush(vapidPublicKey);
        setStatus('on');
      } else {
        await unsubscribeFromPush();
        setStatus('off');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا');
      // اجازه‌ی مرورگر ممکنه رد شده باشه — وضعیت واقعی رو دوباره بخون
      const support = getPushSupportStatus();
      setStatus(support === 'denied' ? 'denied' : 'off');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-start justify-between gap-4 py-3.5 border-b border-stone-100 last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-stone-800">نوتیفیکیشن مرورگر</div>
        <div className="text-[11.5px] text-stone-500 mt-0.5 leading-6">
          {status === 'unsupported' && 'این مرورگر/دستگاه از نوتیفیکیشن مرورگر پشتیبانی نمی‌کند.'}
          {status === 'denied' && 'اجازه‌ی نوتیفیکیشن قبلاً رد شده — از تنظیمات مرورگر برای این سایت روشنش کنید.'}
          {(status === 'on' || status === 'off' || status === 'loading') &&
            'حتی وقتی این سایت باز نیست، نوتیفیکیشن مستقیم به مرورگر/دستگاه شما ارسال می‌شود.'}
        </div>
        {error && <div className="text-[11.5px] text-danger mt-1">{error}</div>}
      </div>
      <div className="flex-shrink-0 pt-1">
        <Switch
          checked={status === 'on'}
          onCheckedChange={handleToggle}
          disabled={busy || status === 'loading' || status === 'unsupported' || status === 'denied'}
          aria-label="نوتیفیکیشن مرورگر"
        />
      </div>
    </div>
  );
}
