function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`h-4 animate-pulse rounded-full bg-surface-container ${className}`} />;
}

function BatchCardSkeleton() {
  return (
    <div className="rounded-lg border border-outline-variant/70 bg-white p-6 shadow-card">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-surface-container" />
        <SkeletonLine className="w-24" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4 border-t border-outline-variant/70 pt-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <SkeletonLine className="w-full" />
            <div className="h-6 w-2/3 animate-pulse rounded-full bg-surface-container" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BatchListLoadingState({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="p-6" aria-busy="true" aria-label="Loading batches" role="status">
      {isAdmin && (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="h-10 w-full animate-pulse rounded-DEFAULT bg-surface-container sm:w-72" />
          <div className="h-10 w-40 animate-pulse rounded-DEFAULT bg-surface-container" />
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <BatchCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
