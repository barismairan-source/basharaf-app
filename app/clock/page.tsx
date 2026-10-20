import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ClockClient } from '@/components/clock/ClockClient';

export const metadata: Metadata = {
  title: 'ثبت حضور',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * /clock — صفحه‌ی ثبت ورود/خروج پرسنل روی گوشی خودشان. بدون ورود به حساب:
 * گوشی یک بار با لینک شخصی (از مدیر) فعال می‌شود و ثبت فقط از اینترنت مغازه
 * پذیرفته می‌شود. شرح: project-docs/ATTENDANCE-CLOCK.md
 */
export default function ClockPage() {
  return (
    <main className="min-h-screen bg-bg flex items-start justify-center px-4 py-10">
      <Suspense fallback={null}>
        <ClockClient />
      </Suspense>
    </main>
  );
}
