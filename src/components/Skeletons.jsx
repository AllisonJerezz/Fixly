export function SkeletonLine({ className = "" }) {
  return <div className={`skeleton h-3 rounded ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 shadow-xl backdrop-blur animate-fade-in">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 text-[11px] text-transparent">.</div>
          <SkeletonLine className="h-4 w-2/3" />
          <div className="mt-2 flex gap-2">
            <div className="skeleton h-5 w-24 rounded-full" />
            <div className="skeleton h-5 w-20 rounded-full" />
          </div>
        </div>
        <div className="skeleton h-10 w-24 rounded-lg" />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="skeleton h-10 rounded-lg" />
        <div className="skeleton h-10 rounded-lg" />
        <div className="skeleton h-10 rounded-lg" />
      </div>
    </div>
  );
}
