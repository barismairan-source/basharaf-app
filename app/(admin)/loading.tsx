import { Skeleton } from '@/components/ui/Skeleton';

export default function AdminLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Admin dashboard header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton.Dark className="h-6 w-36 rounded" />
          <Skeleton.Dark className="h-3.5 w-52 rounded" />
        </div>
        <Skeleton.Dark className="h-9 w-28 rounded-lg" />
      </div>

      {/* Stat cards — 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="rounded-lg border border-stone-800 bg-stone-900 p-5 space-y-3">
            <Skeleton.Dark className="h-3.5 w-20 rounded" />
            <Skeleton.Dark className="h-7 w-24 rounded" />
          </div>
        ))}
      </div>

      {/* Recent audit log */}
      <Skeleton.DarkTable rows={8} />
    </div>
  );
}
