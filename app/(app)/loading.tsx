import { Skeleton } from '@/components/ui/Skeleton';

export default function AppLoading() {
  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Skeleton.PageHeader />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => <Skeleton.Metric key={i} />)}
        </div>
        <Skeleton.Table rows={8} />
      </div>
    </div>
  );
}
