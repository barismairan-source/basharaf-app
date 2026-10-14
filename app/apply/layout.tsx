import type { Metadata } from 'next';
import { SafasityTheme } from '@/components/safasity/SafasityTheme';

export const metadata: Metadata = {
  title: 'فرم همکاری',
  description: 'فرم درخواست همکاری با مجموعه‌ی با شرف',
};

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return <SafasityTheme logo>{children}</SafasityTheme>;
}
