import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'فیش پرداخت',
  robots: { index: false, follow: false },
};

export default function ReceiptsLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-gradient-to-b from-amber-50/70 via-background to-background">{children}</div>;
}
