import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'فرم همکاری',
  description: 'فرم درخواست همکاری با مجموعه‌ی با شرف',
};

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-stone-50">{children}</div>;
}
