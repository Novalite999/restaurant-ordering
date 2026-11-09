// Instant skeleton while the live menu loads.
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8 lg:px-4 lg:pt-6" aria-busy="true" aria-label="Loading">
      <div>
        <div className="space-y-3 bg-paper px-4 pt-5 pb-4 lg:rounded-[var(--radius-card)] lg:p-7">
          <div className="skeleton h-9 w-4/5 rounded-xl" />
          <div className="skeleton h-9 w-1/2 rounded-xl" />
          <div className="flex gap-2 pt-1">
            <div className="skeleton h-8 w-36 rounded-full" />
            <div className="skeleton h-8 w-28 rounded-full" />
          </div>
          <div className="skeleton h-12 w-full rounded-full" />
        </div>
        <div className="flex gap-2 px-4 py-3 lg:px-0">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-9 w-24 shrink-0 rounded-full" />
          ))}
        </div>
        <div className="grid gap-px sm:gap-3 sm:px-4 md:grid-cols-2 lg:px-0">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4 bg-paper p-4 sm:rounded-[var(--radius-card)]">
              <div className="flex-1 space-y-2">
                <div className="skeleton h-5 w-2/3 rounded-lg" />
                <div className="skeleton h-4 w-full rounded-lg" />
                <div className="skeleton h-4 w-1/3 rounded-lg" />
              </div>
              <div className="skeleton size-26 rounded-2xl sm:size-28" />
            </div>
          ))}
        </div>
      </div>
      <div className="hidden lg:block">
        <div className="skeleton h-72 rounded-[var(--radius-card)]" />
      </div>
    </div>
  );
}
