import { db, schema } from '@/lib/db/client';

/**
 * Audit log helper — ثبت عملیات مهم.
 *
 * این تابع fire-and-forget است — خطاهای آن را می‌بلعد
 * تا به flow اصلی آسیب نرساند.
 */

export type AuditAction =
  | 'login.success'
  | 'login.failed'
  | 'login.blocked'
  | 'logout'
  | 'password.changed'
  | 'transaction.approved'
  | 'transaction.rejected'
  | 'transaction.deleted'
  | 'user.created'
  | 'user.deleted'
  | 'branch.deleted';

export async function audit(params: {
  action: AuditAction;
  userId?: string;
  ip?: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(schema.auditLog).values({
      action: params.action,
      userId: params.userId ?? null,
      ip: params.ip ?? null,
      meta: params.meta ? JSON.stringify(params.meta) : null,
    });
  } catch (e) {
    // log silently — نباید عملیات اصلی را block کند
    if (process.env.NODE_ENV !== 'production') {
      console.error('[Audit]', e);
    }
  }
}
