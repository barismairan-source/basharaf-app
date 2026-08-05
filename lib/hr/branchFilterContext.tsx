'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

/**
 * فیلتر شعبه‌ی مشترک منابع انسانی — یک محل ثابت در پوسته‌ی `/hr` (نه تکراری
 * در هر صفحه). چون Next.js layout بین ناوبری صفحات هم‌سطح (people↔time↔payroll)
 * دوباره mount نمی‌شود، این state واقعاً در طول کل جلسه‌ی کاربر در منابع
 * انسانی حفظ می‌شود.
 *
 * وضعیت فعلی (فاز ۳): خودِ کنترل UI + state در پوسته آماده است؛ اتصال کامل
 * هر ۵ صفحه به این مقدار مشترک (به‌جای فیلتر محلی خودشان) به‌تدریج در
 * فازهای ۴ تا ۹ انجام می‌شود که محتوای هر صفحه هم‌زمان بازسازی می‌شود.
 */
const HrBranchFilterContext = createContext<{ branchId: string; setBranchId: (id: string) => void } | null>(null);

export function HrBranchFilterProvider({ children }: { children: ReactNode }) {
  const [branchId, setBranchId] = useState('');
  return (
    <HrBranchFilterContext.Provider value={{ branchId, setBranchId }}>
      {children}
    </HrBranchFilterContext.Provider>
  );
}

export function useHrBranchFilter(): { branchId: string; setBranchId: (id: string) => void } {
  const ctx = useContext(HrBranchFilterContext);
  if (!ctx) throw new Error('useHrBranchFilter باید داخل HrBranchFilterProvider استفاده شود');
  return ctx;
}
