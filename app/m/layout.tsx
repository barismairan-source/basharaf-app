import type { Metadata } from 'next';
import './menu.css';
import { LanguageProvider } from '@/lib/menu/i18n';
import { SafasityTheme } from '@/components/safasity/SafasityTheme';

export const metadata: Metadata = {
  title: 'منو',
  description: 'منوی با شرف',
};

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return <LanguageProvider initial="fa"><SafasityTheme>{children}</SafasityTheme></LanguageProvider>;
}
