import { NextResponse } from 'next/server';
import { clearCustomerSession } from '@/lib/auth/customerSession';

export async function POST() {
  clearCustomerSession();
  return NextResponse.json({ ok: true });
}
