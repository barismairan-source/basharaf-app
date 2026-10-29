/**
 * Runs once when the Next.js server instance boots (Node.js runtime only).
 *
 * Replaces the external HTTP scheduler documented in
 * project-docs/NOTIFICATION-CENTER-V2-ROLLOUT.md §1 step 5: an outside
 * cron service (cron-job.org) could not reliably reach the Liara-hosted
 * app, so the outbox is now processed in-process on a setInterval instead.
 */

export async function register() {
  // شرط به همین شکل لازم است تا webpack شاخه‌ی Node را از bundle Edge حذف کند
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startOutboxScheduler } = await import('./instrumentation-node');
    await startOutboxScheduler();
  }
}
