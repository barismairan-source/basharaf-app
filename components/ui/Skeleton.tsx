import { cn } from '@/lib/utils';

/** پایه — یک مستطیل animate-pulse */
function Base({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded bg-stone-200',
        className,
      )}
    />
  );
}

/** یک خط متن */
function Line({ w = 'w-full', h = 'h-4', className }: { w?: string; h?: string; className?: string }) {
  return <Base className={cn(h, w, className)} />;
}

/** بلوک کارت (border + rounded-lg + padding) */
function Card({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn('rounded-lg border border-stone-200 bg-white p-5', className)}>
      {children}
    </div>
  );
}

/** ردیف جدول — چند ستون با عرض‌های متفاوت */
function TableRow({
  cols = [3, 5, 3, 2],
  className,
}: {
  cols?: number[];
  className?: string;
}) {
  const colSpans = ['w-1/12', 'w-2/12', 'w-3/12', 'w-4/12', 'w-5/12', 'w-6/12'];
  return (
    <div className={cn('flex items-center gap-4 px-4 py-3.5 border-b border-stone-100', className)}>
      {cols.map((c, i) => (
        <Base key={i} className={cn('h-3.5 flex-shrink-0', colSpans[Math.min(c, 5)])} />
      ))}
    </div>
  );
}

/** هدر جدول — یک ردیف با پس‌زمینه stone-50 */
function TableHeader({ cols = [3, 5, 3, 2] }: { cols?: number[] }) {
  const colSpans = ['w-1/12', 'w-2/12', 'w-3/12', 'w-4/12', 'w-5/12', 'w-6/12'];
  return (
    <div className="flex items-center gap-4 px-4 py-2.5 bg-stone-50 border-b border-stone-200 rounded-t-lg">
      {cols.map((c, i) => (
        <Base key={i} className={cn('h-3', colSpans[Math.min(c, 5)])} />
      ))}
    </div>
  );
}

/** n ردیف جدول با سطل تکرار */
function Table({ rows = 6, cols, className }: { rows?: number; cols?: number[]; className?: string }) {
  return (
    <div className={cn('rounded-lg border border-stone-200 bg-white overflow-hidden', className)}>
      <TableHeader cols={cols} />
      {Array.from({ length: rows }, (_, i) => (
        <TableRow key={i} cols={cols} />
      ))}
    </div>
  );
}

/** نوار فیلتر / ابزار */
function Toolbar({ chips = 3, className }: { chips?: number; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Base className="h-9 w-64 rounded-lg" />
      {Array.from({ length: chips }, (_, i) => (
        <Base key={i} className="h-9 w-24 rounded-lg" />
      ))}
      <div className="flex-1" />
      <Base className="h-9 w-28 rounded-lg" />
    </div>
  );
}

/** کارت KPI (عنوان + مقدار + زیرمتن) */
function Metric({ className }: { className?: string }) {
  return (
    <Card className={cn('space-y-3', className)}>
      <Line w="w-20" h="h-3" />
      <Line w="w-28" h="h-7" />
      <Line w="w-16" h="h-2.5" />
    </Card>
  );
}

/** چارت ستونی placeholder */
function Chart({ className }: { className?: string }) {
  const bars = [60, 80, 45, 90, 55, 70, 40, 85, 65, 75, 50, 95];
  return (
    <Card className={cn('', className)}>
      <Line w="w-32" h="h-4" className="mb-4" />
      <div className="flex items-end gap-1.5 h-40">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 animate-pulse rounded-t bg-stone-200"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </Card>
  );
}

/** آواتار دایره */
function Avatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-12 w-12' }[size];
  return <Base className={cn('rounded-full flex-shrink-0', s)} />;
}

/** هدر صفحه (عنوان + دکمه) */
function PageHeader({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div className="space-y-2">
        <Line w="w-32" h="h-6" />
        <Line w="w-48" h="h-3.5" />
      </div>
      <Base className="h-9 w-32 rounded-lg" />
    </div>
  );
}

/** ردیف کارت عمودی با آیکون + عنوان + زیرمتن */
function ActionCard({ className }: { className?: string }) {
  return (
    <Card className={cn('flex items-start gap-4', className)}>
      <Base className="h-10 w-10 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Line w="w-24" h="h-4" />
        <Line w="w-36" h="h-3" />
      </div>
    </Card>
  );
}

/** نسخه‌ی dark برای پنل admin (bg-stone-800 به‌جای stone-200) */
function Dark({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded bg-stone-700', className)}
    />
  );
}

/** جدول dark برای صفحات admin */
function DarkTable({ rows = 6, cols = [3, 5, 2, 2, 1] }: { rows?: number; cols?: number[] }) {
  const colSpans = ['w-1/12', 'w-2/12', 'w-3/12', 'w-4/12', 'w-5/12', 'w-6/12'];
  return (
    <div className="rounded-lg border border-stone-800 bg-stone-900 overflow-hidden">
      {/* header */}
      <div className="flex items-center gap-4 px-4 py-2.5 bg-stone-800/50 border-b border-stone-800">
        {cols.map((c, i) => (
          <Dark key={i} className={cn('h-3', colSpans[Math.min(c, 5)])} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, ri) => (
        <div key={ri} className="flex items-center gap-4 px-4 py-3.5 border-b border-stone-800/60">
          {cols.map((c, i) => (
            <Dark key={i} className={cn('h-3.5', colSpans[Math.min(c, 5)])} />
          ))}
        </div>
      ))}
    </div>
  );
}

export const Skeleton = Object.assign(Base, {
  Line,
  Card,
  TableRow,
  TableHeader,
  Table,
  Toolbar,
  Metric,
  Chart,
  Avatar,
  PageHeader,
  ActionCard,
  Dark,
  DarkTable,
});
