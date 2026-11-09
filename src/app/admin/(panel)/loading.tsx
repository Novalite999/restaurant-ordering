export default function Loading() {
  return (
    <div className="px-4 pt-5 lg:px-8 lg:pt-8" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-9 w-48 rounded-xl" />
      <div className="skeleton mt-2 h-4 w-72 max-w-full rounded" />
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-28 rounded-[var(--radius-card)]" />
        ))}
      </div>
      <div className="skeleton mt-4 h-72 rounded-[var(--radius-card)]" />
    </div>
  );
}
