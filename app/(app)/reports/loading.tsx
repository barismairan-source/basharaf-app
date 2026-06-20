import { Skeleton } from '@/components/ui/Skeleton';

export default function ReportsLoading() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* PageHeader + export/print buttons */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton.Line w="w-28" h="h-6" />
          <Skeleton.Line w="w-40" h="h-3.5" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      {/* Filter bar: branch select + from/to date + apply */}
      <Skeleton.Card className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-10 w-44 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
      </Skeleton.Card>

      {/* Summary KPI — 4 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map(i => <Skeleton.Metric key={i} />)}
      </div>

      {/* Two charts side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton.Chart className="h-64" />
        <Skeleton.Chart className="h-64" />
      </div>

      {/* Category table */}
      <Skeleton.Table rows={6} cols={[4, 2, 4, 2]} />
    </div>
  );
}
