/**
 * Notification outbox processor trigger script.
 *
 * Usage:
 *   PROCESSOR_SECRET=<secret> node scripts/process-notifications.mjs
 *
 * Exits 0 on success (2xx response), non-zero on error.
 * Logs only the HTTP status — never prints the secret or response body.
 *
 * ── Liara scheduling note ────────────────────────────────────────
 * The Liara Next.js platform ("platform": "next") does NOT support
 * a built-in cron field in liara.json. To schedule this script:
 *
 *   Option A (recommended): Liara Cron Job service — create a separate
 *     cron job that calls POST /api/internal/notifications/process with
 *     the Authorization header. No local script needed.
 *
 *   Option B: Call this script from a long-running worker process
 *     (e.g., a Liara Node.js app) on a setInterval.
 *
 *   Option C: Use an external cron provider (cron-job.org, GitHub Actions
 *     schedule) to POST the endpoint on a schedule.
 *
 * See ROLLOUT.md §3 for the full release checklist.
 * ─────────────────────────────────────────────────────────────────
 */

const TIMEOUT_MS = 50_000;

const secret = process.env.PROCESSOR_SECRET;
if (!secret) {
  console.error('[process-notifications] PROCESSOR_SECRET env var is required');
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
