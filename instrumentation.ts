/**
 * Runs once when the Next.js server instance boots (Node.js runtime only).
 *
 * Replaces the external HTTP scheduler documented in
 * project-docs/NOTIFICATION-CENTER-V2-ROLLOUT.md §1 step 5: an outside
 * cron service (cron-job.org) could not reliably reach the Liara-hosted
 * app, so the outbox is now processed in-process on a setInterval instead.
 */

const PROCESS_INTERVAL_MS = 60 * 1000;

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

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
