function Bar({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-full bg-surface-container ${className}`} />;
}

function FieldSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <div className={`grid grid-cols-[0.9375rem_minmax(0,1fr)] items-start gap-x-2.5 ${wide ? 'sm:col-span-2' : ''}`}>
      <div className="mt-0.5 h-[15px] w-[15px] shrink-0 animate-pulse rounded-full bg-surface-container" />
      <div className="min-w-0 space-y-1.5">
        <Bar className="h-3 w-16" />
        <Bar className="h-4 w-28" />
      </div>
    </div>
  );
}

function SectionSkeleton({ fieldCount, wideLast = false }: { fieldCount: number; wideLast?: boolean }) {
  return (
    <div className="space-y-3 border-t border-outline-variant/60 pt-5 first:border-t-0 first:pt-0">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 shrink-0 animate-pulse rounded-lg bg-surface-container" />
        <Bar className="h-3.5 w-36" />
      </div>
      <div className="grid grid-cols-1 gap-x-4 gap-y-4 pl-9 sm:grid-cols-2">
        {Array.from({ length: fieldCount }).map((_, i) => (
          <FieldSkeleton key={i} wide={wideLast && i === fieldCount - 1} />
        ))}
      </div>
    </div>
  );
}

// Mirrors AlumniDetailView's section structure so the modal doesn't resize once the real record loads.
export function AlumniDetailViewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-xl bg-linear-to-br from-secondary-container/25 via-white to-white p-3 sm:gap-4 sm:p-4">
        <div className="h-16 w-16 shrink-0 animate-pulse rounded-full bg-surface-container sm:h-20 sm:w-20" />
        <div className="min-w-0 space-y-2">
          <Bar className="h-5 w-40" />
          <div className="mt-1.5 flex gap-2">
            <Bar className="h-6 w-24" />
            <Bar className="h-6 w-16" />
          </div>
        </div>
      </div>

      <SectionSkeleton fieldCount={3} />
      <SectionSkeleton fieldCount={3} wideLast />
      <SectionSkeleton fieldCount={2} />
      <SectionSkeleton fieldCount={1} />

      <div className="rounded-lg bg-surface-container-low p-4">
        <div className="flex items-center gap-2">
          <div className="h-3.5 w-3.5 animate-pulse rounded-sm bg-surface-container" />
          <Bar className="h-3 w-28" />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Bar className="h-3 w-20" />
              <Bar className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
