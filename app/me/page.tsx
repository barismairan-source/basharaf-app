import type { Metadata, Viewport } from 'next';
import { MeClient } from '@/components/me/MeClient';
import { SafasityTheme } from '@/components/safasity/SafasityTheme';

/**
 * /me — پنل پرسنل: حضور، شیفت، حقوق و مشخصات خودِ هر نفر. بدون حساب کاربری؛ با همان گوشی
 * فعال‌شده‌ی ثبت حضور. اطلاعات حساس با Face ID باز می‌شود. شرح: project-docs/STAFF-PANEL.md
 */
export const metadata: Metadata = {
  title: 'پنل من',
  robots: { index: false, follow: false },
  appleWebApp: { capable: false, title: 'basharaf' },
  other: { 'mobile-web-app-capable': 'no' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', colorScheme: 'light', themeColor: '#3A4454' };

export const dynamic = 'force-dynamic';

export default function MePage() {
  return (
    <SafasityTheme>
      <main className="min-h-screen px-4 py-5">
        <MeClient />
      </main>
    </SafasityTheme>
  );
}
