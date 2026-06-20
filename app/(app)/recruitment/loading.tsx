import { Skeleton } from '@/components/ui/Skeleton';

export default function RecruitmentLoading() {
  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* PageHeader + export button */}
      <Skeleton.PageHeader />

      {/* Filter bar: search + status + gender */}
      <Skeleton.Toolbar chips={2} />

      {/* Kanban board — 4 status columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map(col => (
          <div key={col} className="rounded-lg border border-stone-200 bg-stone-50 p-3 space-y-3">
            {/* Column header */}
            <div className="flex items-center justify-between px-1">
              <Skeleton.Line w="w-20" h="h-4" />
              <Skeleton className="h-5 w-6 rounded-full" />
            </div>
            {/* Candidate cards */}
            {[0, 1, 2].map(card => (
              <Skeleton.Card key={card} className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <Skeleton.Avatar size="sm" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton.Line w="w-24" h="h-3.5" />
                    <Skeleton.Line w="w-16" h="h-3" />
                  </div>
                </div>
                <Skeleton.Line w="w-32" h="h-3" />
              </Skeleton.Card>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
