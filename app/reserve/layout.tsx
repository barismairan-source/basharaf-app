import type { Metadata } from 'next';
import { SafasityTheme } from '@/components/safasity/SafasityTheme';

export const metadata: Metadata = {
  title: 'رزرو میز — با شرف',
};

export default function ReserveLayout({ children }: { children: React.ReactNode }) {
  return <SafasityTheme logo>{children}</SafasityTheme>;
}
