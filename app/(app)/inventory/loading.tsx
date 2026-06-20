import { Skeleton } from '@/components/ui/Skeleton';

export default function InventoryLoading() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* PageHeader */}
      <Skeleton.PageHeader />

      {/* Branch selector */}
      <Skeleton className="h-10 w-48 rounded-lg" />

      {/* Primary action cards — 4 large cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map(i => (
          <Skeleton.Card key={i} className="flex items-start gap-4 min-h-[100px]">
            <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2.5">
              <Skeleton.Line w="w-28" h="h-4" />
              <Skeleton.Line w="w-40" h="h-3" />
              <Skeleton.Line w="w-16" h="h-3" />
            </div>
          </Skeleton.Card>
        ))}
      </div>

      {/* More actions list */}
      <div className="rounded-lg border border-stone-200 bg-white divide-y divide-stone-100 overflow-hidden">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton.Line w="w-24" h="h-3.5" />
              <Skeleton.Line w="w-36" h="h-3" />
            </div>
            <Skeleton className="h-4 w-4 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
