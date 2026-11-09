export default function Loading() {
  return (
    <div className="mx-auto max-w-lg px-4 pt-6" aria-busy="true" aria-label="Loading your order">
      <div className="ticket-edge space-y-4 bg-paper px-5 pt-6 pb-10">
        <div className="skeleton h-4 w-24 rounded" />
        <div className="skeleton h-10 w-40 rounded-xl" />
        <div className="skeleton h-7 w-3/4 rounded-xl" />
        <div className="skeleton h-12 w-full rounded-xl" />
        <div className="space-y-2 pt-4">
          <div className="skeleton h-5 w-full rounded" />
          <div className="skeleton h-5 w-5/6 rounded" />
          <div className="skeleton h-5 w-2/3 rounded" />
        </div>
      </div>
    </div>
  );
}
