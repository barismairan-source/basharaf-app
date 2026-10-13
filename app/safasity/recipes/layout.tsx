import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'رسپی‌بوک',
  description: 'رسپی‌های صفاسیتی — قدم‌به‌قدم و در خانه',
};

export default function RecipesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
