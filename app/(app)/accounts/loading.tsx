import { Skeleton } from '@/components/ui/Skeleton';

export default function AccountsLoading() {
  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* PageHeader + add button */}
      <Skeleton.PageHeader />

      {/* Account type cards — 3 cards (cash, bank, pos) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => (
          <Skeleton.Card key={i} className="space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton.Line w="w-24" h="h-4" />
            </div>
            <Skeleton.Line w="w-32" h="h-7" />
            <Skeleton.Line w="w-20" h="h-3" />
          </Skeleton.Card>
        ))}
      </div>

      {/* Accounts list table — cols: name, type, balance, actions */}
      <Skeleton.Table rows={5} cols={[4, 3, 4, 1]} />
    </div>
  );
}
