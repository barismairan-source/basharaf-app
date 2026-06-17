import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';

export async function createPendingNotifications(voucherId: string, title: string, branchId: string) {
  const admins = await db.select({ id: schema.users.id }).from(schema.users)
    .where(eq(schema.users.role, 'SuperAdmin'));
  if (admins.length === 0) return;
  await db.insert(schema.notifications).values(
    admins.map(admin => ({
      type: 'pending' as const,
      title: 'برگه انبار در انتظار تأیید',
      sub: title,
      time: 'به‌تازگی',
      read: false,
      txId: null,
      userId: admin.id,
    }))
  );
}
