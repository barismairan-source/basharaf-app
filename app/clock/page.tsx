import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { ClockClient } from '@/components/clock/ClockClient';

/**
 * آیکن صفحه‌ی اصلی گوشی برای پرسنل باید مستقیم /clock را باز کند، نه /dashboard
 * (manifest اصلی سایت) که ورود به حساب می‌خواهد. و باید داخل خود مرورگر باز شود
 * (display: browser، بدون apple-mobile-web-app-capable): آیکنِ «standalone» در آیفون
 * حافظه و کوکی جدا از Safari دارد، پس کلید گوشی که در Safari فعال شده آنجا نیست.
 */
export const metadata: Metadata = {
  title: 'ثبت حضور',
  robots: { index: false, follow: false },
  manifest: '/clock.webmanifest',
  // نام آیکن روی صفحه‌ی اصلی گوشی
  appleWebApp: { capable: false, title: 'basharaf' },
  applicationName: 'basharaf',
  other: { 'mobile-web-app-capable': 'no' },
  // آیکن صفاسیتی (کرم روی سرمه‌ای) — آیفون apple-touch-icon را برمی‌دارد، نه manifest را
  icons: {
    icon: [
      { url: '/icons/basharaf-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/basharaf-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/basharaf-apple-180.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'light',
  themeColor: '#3A4454',
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
