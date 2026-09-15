import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'رسپی‌بوک',
  description: 'رسپی‌های صفاسیتی — قدم‌به‌قدم و در خانه',
};

export default function RecipesLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-gradient-to-b from-amber-50/70 via-background to-background">{children}</div>;
}
