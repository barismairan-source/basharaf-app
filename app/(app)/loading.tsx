/**
 * Loading skeleton — Next.js این فایل را خودکار در حین route transition
 * نمایش می‌دهد، تا کاربر تجربه‌ی فوری ببیند.
 */
export default function AppLoading() {
  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header skeleton */}
        <div>
          <div className="h-6 w-32 bg-stone-200 rounded animate-pulse" />
          <div className="h-4 w-48 bg-stone-100 rounded animate-pulse mt-2" />
        </div>

        {/* Content skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 bg-white border border-stone-200 rounded-lg animate-pulse"
            />
          ))}
        </div>

        <div className="h-96 bg-white border border-stone-200 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}
