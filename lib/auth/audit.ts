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
  | 'login.blocked_inactive'
  | 'logout'
  | 'password.changed'
  | 'transaction.approved'
  | 'transaction.rejected'
  | 'transaction.deleted'
  | 'transaction.nonFinancialEdit'
  | 'user.created'
  | 'user.deleted'
  | 'branch.deleted'
  | 'inv.produce'
  | 'inv.stocktake'
  | 'inv.voucher.approved'
  | 'inv.voucher.rejected'
  | 'inv.voucher.created'
  | 'inv.autoRecost.afterPurchase'
  | 'transaction.menuSaleDeduction.warning'
  | 'inventory_clamp_warning'
  | 'reversal_created'
  | 'settings.factoryReset'
  | 'loyalty.earn'
  | 'loyalty.redeem'
  | 'loyalty.adjust'
  | 'equipment.created'
  | 'equipment.updated'
  | 'equipment.deleted'
  | 'maintenance.created'
  | 'po.created'
  | 'po.updated'
  | 'po.received'
  | 'po.receiveDiscrepancy'
  | 'taskTemplate.created'
  | 'taskTemplate.updated'
  | 'task.generated'
  | 'task.completed'
  | 'task.skipped'
  | 'task.assigned'
  | 'admin.impersonation.started'
  | 'admin.impersonation.ended'
  | 'admin.user.suspended'
  | 'admin.user.activated'
  | 'admin.user.roleChanged'
  | 'admin.user.branchChanged'
  | 'inv.recipe.priceChanged'
  | 'payroll.forceReset';

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
