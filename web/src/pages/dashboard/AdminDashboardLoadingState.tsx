const SKELETON_LINE_WIDTHS = ['w-3/5', 'w-4/5', 'w-2/3'];

function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`h-4 animate-pulse rounded-full bg-surface-container ${className}`} />;
}

function DashboardCard({ children, className = '', 'data-testid': testId }: { children: React.ReactNode; className?: string; 'data-testid'?: string }) {
  return <div className={`rounded-DEFAULT border border-outline-variant/70 bg-white shadow-panel ${className}`} data-testid={testId}>{children}</div>;
}

export function AdminDashboardLoadingState() {
  return (
    <div className="p-6" aria-busy="true" aria-label="Loading dashboard" role="status">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <DashboardCard key={index} className="min-h-40 flex items-center gap-4 border-t-4 border-t-primary-fixed-dim p-6" data-testid="loading-stat-card">
            <div className="h-12 w-12 shrink-0 animate-pulse rounded-md bg-surface-container" data-testid="loading-stat-icon" />
            <div className="space-y-2">
              <SkeletonLine className="w-24" />
              <SkeletonLine className="w-16" />
            </div>
          </DashboardCard>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DashboardCard className="min-w-0 p-6 lg:col-span-2" data-testid="loading-panel">
          <div className="flex items-center justify-between">
            <SkeletonLine className="w-32" />
            <SkeletonLine className="w-16" />
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[32rem]">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low text-left text-label-sm text-on-surface-variant">
                  <th className="px-2 py-3">Name</th>
                  <th className="px-2 py-3">Batch</th>
                  <th className="px-2 py-3">School</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-outline-variant">
                    {Array.from({ length: 3 }).map((_, columnIndex) => (
                      <td key={columnIndex} className="px-2 py-3">
                        <SkeletonLine className={SKELETON_LINE_WIDTHS[(rowIndex + columnIndex) % SKELETON_LINE_WIDTHS.length]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardCard>

        <DashboardCard className="p-6" data-testid="loading-panel">
          <SkeletonLine className="w-40" />
          <div className="mt-4 flex h-56 items-end gap-3 rounded-DEFAULT bg-surface-container-low p-5">
            {[40, 70, 55, 85, 65, 90].map((height, index) => (
              <div key={index} className="flex-1 animate-pulse rounded-t-DEFAULT bg-surface-container" style={{ height: `${height}%` }} />
            ))}
          </div>
        </DashboardCard>

        <DashboardCard className="p-6" data-testid="loading-panel">
          <SkeletonLine className="w-36" />
          <div className="mt-4 flex min-h-[17rem] items-center justify-center" data-testid="loading-doughnut-wrapper">
            <div className="h-56 w-56 shrink-0 animate-pulse rounded-full border-28 border-surface-container" data-testid="loading-doughnut" />
          </div>
        </DashboardCard>

        <DashboardCard className="p-6" data-testid="loading-panel">
          <SkeletonLine className="w-28" />
          <div className="mt-3 flex flex-col gap-6 desktop:flex-row">
            <div className="flex shrink-0 flex-col gap-4 desktop:basis-[58%]">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="flex min-w-0 items-center gap-4 rounded-DEFAULT border border-outline-variant bg-surface-container-low p-6 desktop:h-24" data-testid="loading-activity-featured">
                  <div className="h-12 w-12 shrink-0 animate-pulse rounded-md bg-surface-container" />
                  <div className="flex-1 space-y-2"><SkeletonLine className="w-4/5" /><SkeletonLine className="h-3 w-2/5" /></div>
                </div>
              ))}
            </div>
            <section aria-label="Activity history" className="space-y-3 desktop:flex-1">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-start gap-3 border-b border-outline-variant/70 py-3">
                  <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-surface-container" />
                  <div className="flex-1 space-y-2"><SkeletonLine className="w-4/5" /><SkeletonLine className="h-3 w-2/5" /></div>
                </div>
              ))}
            </section>
          </div>
        </DashboardCard>

        <DashboardCard className="p-6" data-testid="loading-panel">
          <SkeletonLine className="w-32" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 rounded-DEFAULT border border-outline-variant/70 p-3">
                <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-surface-container" />
                <div className="flex-1 space-y-2">
                  <SkeletonLine className="w-3/5" />
                  <SkeletonLine className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>

      <div className="mt-6">
        <SkeletonLine className="w-28" />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <DashboardCard key={index} className="flex items-center gap-3 rounded-DEFAULT p-6" data-testid="loading-quick-action">
              <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-surface-container" />
              <div className="space-y-2">
                <SkeletonLine className="w-24" />
                <SkeletonLine className="h-3 w-32" />
              </div>
            </DashboardCard>
          ))}
        </div>
      </div>
    </div>
  );
}
