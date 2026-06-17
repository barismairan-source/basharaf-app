import './menu.css';
import { LanguageProvider } from '@/lib/menu/i18n';

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return <LanguageProvider initial="fa">{children}</LanguageProvider>;
}
