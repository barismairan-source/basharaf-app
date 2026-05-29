/**
 * DashboardSkeleton — حالت loading برای داشبورد در زمان hydration.
 *
 * شکل کلی صفحه را با placeholder خاکستری نشان می‌دهد تا کاربر
 * بداند چه چیزی در راه است (نه یک صفحه سفید).
 *
 * بسیار سبک — فقط div با animate-pulse، بدون state.
 */
export function DashboardSkeleton() {
  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <div className="h-6 w-32 bg-stone-200 rounded" />
            <div className="h-3 w-48 bg-stone-100 rounded mt-2" />
          </div>
          <div className="h-9 w-32 bg-stone-100 rounded" />
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 bg-white border border-stone-100 rounded-lg p-5"
            >
              <div className="h-3 w-16 bg-stone-100 rounded" />
              <div className="h-7 w-24 bg-stone-200 rounded mt-4" />
              <div className="h-2 w-full bg-stone-100 rounded mt-4" />
            </div>
          ))}
        </div>

        {/* Two-column breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-64 bg-white border border-stone-100 rounded-lg" />
          <div className="h-64 bg-white border border-stone-100 rounded-lg" />
        </div>

        {/* Recent list */}
        <div className="h-64 bg-white border border-stone-100 rounded-lg" />
      </div>
    </div>
  );
}
