import { Skeleton } from '@/components/ui/Skeleton';

export default function TransactionsLoading() {
  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* PageHeader + new button */}
      <Skeleton.PageHeader />

      {/* KPI strip — 4 metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => <Skeleton.Metric key={i} />)}
      </div>

      {/* Filter toolbar: search + status chips + sort */}
      <div className="space-y-3">
        <Skeleton.Toolbar chips={4} />
        <div className="flex items-center gap-2">
          {[0, 1, 2].map(i => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
      </div>

      {/* Transaction table — cols: date, title, account, amount, status */}
      <Skeleton.Table rows={10} cols={[2, 4, 3, 3, 2]} />
    </div>
  );
}
