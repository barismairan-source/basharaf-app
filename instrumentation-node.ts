/**
 * Node.js-only part of instrumentation.ts — loaded only when NEXT_RUNTIME is
 * 'nodejs', so the Edge bundle never pulls in web-push (http/https) through
 * the notification processor (Next 15 compiles instrumentation for Edge too).
 */

const PROCESS_INTERVAL_MS = 60 * 1000;

export async function startOutboxScheduler() {
  // روی سرور دوم (مثلاً VPS در دوره‌ی موازی با لیارا) خاموش می‌شود تا اعلان/پیامک دوبار ارسال نشود.
  if (process.env.OUTBOX_SCHEDULER === 'off') return;

  const { processOutboxBatch } = await import('@/lib/notifications/processor');
  const { logEvent } = await import('@/lib/logger');

  let isRunning = false;

  setInterval(() => {
    if (isRunning) return;
    isRunning = true;

    processOutboxBatch()
      .catch((err) =>
        logEvent({
          level: 'error',
          category: 'notification',
          message: 'in-process outbox scheduler tick failed',
          context: { error: String(err) },
        }).catch(() => {})
      )
      .finally(() => {
        isRunning = false;
      });
  }, PROCESS_INTERVAL_MS);
}
