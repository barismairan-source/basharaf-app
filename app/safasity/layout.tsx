import type { Metadata } from 'next';
import { SafasityTheme } from '@/components/safasity/SafasityTheme';

export const metadata: Metadata = {
  title: 'صفاسیتی',
  description: 'منو، همکاری، اینستاگرام و راه‌های ارتباط با صفاسیتی',
};

export default function SafasityHubLayout({ children }: { children: React.ReactNode }) {
  return <SafasityTheme>{children}</SafasityTheme>;
}
