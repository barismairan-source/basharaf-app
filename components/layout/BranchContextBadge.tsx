'use client';

import { Building2 } from 'lucide-react';
import { useAppStore } from '@/store';

/**
 * BranchContextBadge — نشان می‌دهد کاربر در چه محدوده‌ی شعبه‌ای کار می‌کند.
 *
 * این جای خالی در Header وجود داشت — یک div کامنت‌گذاری‌شده «GlobalBranchSelector
 * بعداً اینجا mount می‌شود» که هیچ‌وقت واقعاً mount نشد؛ یعنی سمت راست هدر
 * (در RTL: شروع) همیشه کاملاً خالی بود، نه فقط فضای بلااستفاده بلکه ابهام
 * درباره‌ی «الان محدوده‌ی داده کدام شعبه است».
 *
 * فقط نمایشی است — سوییچ شعبه نیست (آن قابلیت از قبل per-page وجود دارد،
 * مثلاً در گزارش/انبار). BranchUser/Warehouse/Chef که به یک شعبه مقید هستند
 * نام همان شعبه را می‌بینند؛ SuperAdmin که دامنه‌اش سراسری است «همه شعب»
 * می‌بیند — بدون تغییر در منطق دسترسی یا داده.
 */
export function BranchContextBadge() {
  const user = useAppStore((s) => s.user);
  const branches = useAppStore((s) => s.branches);

  if (!user) return null;

  const label =
    user.role === 'SuperAdmin'
      ? 'همه شعب'
      : (branches.find((b) => b.id === user.assignedBranch)?.name ?? null);

  if (!label) return null;

  return (
    <div
      title={label}
      className="flex items-center gap-1.5 text-[11.5px] text-muted px-2 py-1 rounded-full border border-border bg-bg"
    >
      <Building2 size={12} strokeWidth={1.5} aria-hidden="true" />
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}
