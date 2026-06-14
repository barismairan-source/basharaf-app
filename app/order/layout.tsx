import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'سفارش بیرون‌بر',
};

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
