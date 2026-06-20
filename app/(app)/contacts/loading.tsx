import { Skeleton } from '@/components/ui/Skeleton';

export default function ContactsLoading() {
  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* PageHeader */}
      <Skeleton.PageHeader />

      {/* Toolbar: search + type filter + add button */}
      <Skeleton.Toolbar chips={2} />

      {/* Contacts table — cols: name, type, phone, balance, actions */}
      <Skeleton.Table rows={8} cols={[4, 2, 3, 3, 1]} />
    </div>
  );
}
