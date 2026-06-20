import { Skeleton } from '@/components/ui/Skeleton';

export default function AdminAuditLoading() {
  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton.Dark className="h-6 w-32 rounded" />
          <Skeleton.Dark className="h-3.5 w-48 rounded" />
        </div>
        <Skeleton.Dark className="h-9 w-24 rounded-lg" />
      </div>

      {/* Filter: action type + user + page */}
      <div className="flex items-center gap-3">
        <Skeleton.Dark className="h-9 w-44 rounded-lg" />
        <Skeleton.Dark className="h-9 w-36 rounded-lg" />
      </div>

      {/* Audit log table — action, userId, meta, IP, createdAt */}
      <Skeleton.DarkTable rows={12} cols={[3, 2, 4, 2, 3]} />

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Skeleton.Dark className="h-4 w-32 rounded" />
        <div className="flex gap-2">
          <Skeleton.Dark className="h-8 w-20 rounded-lg" />
          <Skeleton.Dark className="h-8 w-20 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
