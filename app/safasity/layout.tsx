import type { Metadata } from 'next';
import './safasity.css';

export const metadata: Metadata = {
  title: 'صفاسیتی',
  description: 'منو، همکاری، اینستاگرام و راه‌های ارتباط با صفاسیتی',
};

export default function SafasityHubLayout({ children }: { children: React.ReactNode }) {
  return <div className="safasity-root">{children}</div>;
}
