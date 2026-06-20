import { Skeleton } from '@/components/ui/Skeleton';

export default function AdminUsersLoading() {
  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton.Dark className="h-6 w-40 rounded" />
          <Skeleton.Dark className="h-3.5 w-56 rounded" />
        </div>
      </div>

      {/* Search + filter bar */}
      <div className="flex items-center gap-3">
        <Skeleton.Dark className="h-9 w-60 rounded-lg" />
        <Skeleton.Dark className="h-9 w-28 rounded-lg" />
        <Skeleton.Dark className="h-9 w-28 rounded-lg" />
      </div>

      {/* Users table — name, email, role, branch, status, actions */}
      <Skeleton.DarkTable rows={10} cols={[3, 4, 2, 3, 2, 1]} />
    </div>
  );
}
