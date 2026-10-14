import type { Metadata } from 'next';
import { SafasityTheme } from '@/components/safasity/SafasityTheme';

export const metadata: Metadata = {
  title: 'سفارش بیرون‌بر',
};

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return <SafasityTheme logo>{children}</SafasityTheme>;
}
