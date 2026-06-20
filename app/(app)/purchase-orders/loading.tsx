import { Skeleton } from '@/components/ui/Skeleton';

export default function PurchaseOrdersLoading() {
  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* PageHeader + new PO button */}
      <Skeleton.PageHeader />

      {/* Toolbar: search + status filter */}
      <Skeleton.Toolbar chips={3} />

      {/* PO table — cols: number, supplier, date, total, status, actions */}
      <Skeleton.Table rows={7} cols={[2, 4, 3, 3, 2, 1]} />
    </div>
  );
}
