import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'رزرو میز — با شرف',
};

export default function ReserveLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
