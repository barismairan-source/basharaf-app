import type { Metadata } from 'next';
import PayCard from './PayCard';

export const metadata: Metadata = {
  title: 'واریز به حساب',
  robots: { index: false, follow: false },
};

export default function PayPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/70 via-background to-background">
      <PayCard />
    </div>
  );
}
