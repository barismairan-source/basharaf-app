/**
 * Notification outbox processor trigger script.
 *
 * Required env vars (must be set in the worker environment):
 *   NOTIFICATION_PROCESSOR_SECRET  — must match the app's NOTIFICATION_PROCESSOR_SECRET
 *   APP_URL                        — base URL of the deployed app (e.g. https://basharaf.me)
 *
 * Usage:
 *   NOTIFICATION_PROCESSOR_SECRET=<secret> APP_URL=https://basharaf.me \
 *     node scripts/process-notifications.mjs
 *
 * Exits 0 on success (2xx response), non-zero on error.
 * Logs only the HTTP status — never prints the secret or response body.
 *
 * ── Scheduling note ──────────────────────────────────────────────
 * This script is only needed when using a Node.js worker process.
 * Any scheduler that can make an HTTP POST request is sufficient:
 *
 *   External cron (cron-job.org, GitHub Actions, system cron, etc.)
 *   POST https://basharaf.me/api/internal/notifications/process
 *   Authorization: Bearer <NOTIFICATION_PROCESSOR_SECRET>
 *   Body: (empty)
 *   Frequency: every minute
 *   Timeout: below 60 seconds
 *
 * When using an external scheduler, APP_URL and this script are not needed.
 *
 * See project-docs/NOTIFICATION-CENTER-V2-ROLLOUT.md for the full release checklist.
 * ─────────────────────────────────────────────────────────────────
 */

const TIMEOUT_MS = 50_000;

const secret = process.env.NOTIFICATION_PROCESSOR_SECRET;
if (!secret) {
  console.error('[process-notifications] NOTIFICATION_PROCESSOR_SECRET env var is required');
  process.exit(1);
}

const baseUrl = process.env.APP_URL ?? 'http://localhost:3000';
const url = `${baseUrl}/api/internal/notifications/process`;

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

try {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    signal: controller.signal,
  });

  clearTimeout(timer);

  if (res.ok) {
    console.log(`[process-notifications] OK ${res.status}`);
    process.exit(0);
  } else {
    console.error(`[process-notifications] ERROR ${res.status}`);
    process.exit(1);
  }
} catch (err) {
  clearTimeout(timer);
  if (err.name === 'AbortError') {
    console.error(`[process-notifications] TIMEOUT after ${TIMEOUT_MS}ms`);
  } else {
    console.error(`[process-notifications] FETCH_ERROR ${err.message}`);
  }
  process.exit(1);
}
