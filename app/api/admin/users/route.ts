import { NextResponse } from 'next/server';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';

export async function GET() {
  try {
    await requireAdmin();
    const rows = await db.select().from(schema.users);
    return NextResponse.json({
      users: rows.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        assignedBranch: u.assignedBranchId,
        initials: u.initials,
        lastSeen: u.lastSeen,
        joined: u.joined,
        permissions: u.permissions ?? null,
        isActive: u.isActive,
      })),
    });
  } catch (e) {
    return handleError(e);
  }
}
