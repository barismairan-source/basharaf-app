import { Skeleton } from '@/components/ui/Skeleton';

export default function LogsLoading() {
  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* PageHeader + refresh button */}
      <Skeleton.PageHeader />

      {/* Level filter tabs + count badges */}
      <div className="flex items-center gap-2">
        {[0, 1, 2, 3].map(i => (
          <Skeleton key={i} className="h-9 w-24 rounded-lg" />
        ))}
      </div>

      {/* Log entry cards */}
      <div className="space-y-2">
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <div
            key={i}
            className="rounded-lg border border-stone-200 bg-white px-4 py-3.5 space-y-2"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <div className="flex-1" />
              <Skeleton.Line w="w-28" h="h-3" />
            </div>
            <Skeleton.Line w="w-full" h="h-3.5" />
            <Skeleton.Line w="w-3/4" h="h-3" />
          </div>
        ))}
      </div>
    </div>
  );
}
