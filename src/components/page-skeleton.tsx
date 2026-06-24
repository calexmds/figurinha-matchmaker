export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-28 rounded-2xl bg-line" />
      <div className="space-y-2">
        <div className="h-4 w-24 rounded bg-line" />
        <div className="h-8 w-48 rounded bg-line" />
        <div className="h-4 w-full max-w-xs rounded bg-mica" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="fluent-card h-20 p-4">
            <div className="h-3 w-16 rounded bg-mica" />
            <div className="mt-3 h-7 w-10 rounded bg-line" />
          </div>
        ))}
      </div>
      <div className="fluent-card h-32 p-5">
        <div className="h-4 w-32 rounded bg-line" />
        <div className="mt-4 h-3 w-full rounded bg-mica" />
        <div className="mt-2 h-3 w-4/5 rounded bg-mica" />
      </div>
    </div>
  );
}
