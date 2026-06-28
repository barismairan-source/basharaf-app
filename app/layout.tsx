import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { SessionSync } from '@/components/auth/SessionSync';
import { ThemeProvider } from '@/components/ui';
import './globals.css';

/**
 * Vazirmatn — فونت فارسی local.
 *
 * به‌جای next/font/google از next/font/local استفاده می‌کنیم چون:
 * - سرورهای ایران (Liara) به Google Fonts دسترسی ندارند
 * - فایل‌های woff2 در public/fonts/ قرار دارند
 * - build سریع‌تر است (نیازی به fetch در build time نیست)
 * - privacy بهتر (request به Google ارسال نمی‌شود)
 */
const vazirmatn = localFont({
  src: [
    { path: '../public/fonts/Vazirmatn-300.woff2', weight: '300', style: 'normal' },
    { path: '../public/fonts/Vazirmatn-400.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/Vazirmatn-500.woff2', weight: '500', style: 'normal' },
    { path: '../public/fonts/Vazirmatn-600.woff2', weight: '600', style: 'normal' },
    { path: '../public/fonts/Vazirmatn-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-vazir',
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: 'با شرف',
    template: '%s | با شرف',
  },
  description: 'با شرف',
  applicationName: 'با شرف',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'با شرف',
  },
  icons: {
    apple: '/apple-touch-icon.png',
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  formatDetection: { telephone: false, email: false, address: false },
  other: { 'mobile-web-app-capable': 'yes' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  colorScheme: 'light',
  themeColor: '#1c1917',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body className="font-sans antialiased bg-background text-foreground min-h-screen">
        <ThemeProvider />
        <SessionSync />
        {children}
      </body>
    </html>
  );
}
