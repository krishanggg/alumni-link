import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend,
} from 'chart.js';
import ChartDataLabels, { type Context } from 'chartjs-plugin-datalabels';
import { Bar, Doughnut } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import {
  Users, GraduationCap, UserPlus, FileText,
  ChevronRight, PieChart, UserCheck, Archive,
} from 'lucide-react';

import type { AdminDashboardData } from '../../types/Dashboard';

import { StatCard } from '../../components/shared/StatCard';
import { DoughnutLegend } from '../../components/shared/DoughnutLegend';
import { EmptyState } from '../../components/shared/EmptyState';
import { DashboardPanel } from '../../components/dashboard/DashboardPanel';
import { QuickActions } from '../../components/dashboard/QuickActions';
import { ActivityFeed } from '../../components/dashboard/ActivityFeed';
import { AdminDashboardLoadingState } from './AdminDashboardLoadingState';

import { TONE_CLASSES } from '../../lib/toneClasses';
import { REPORT_TYPE_META, DEFAULT_REPORT_META, formatReportType } from '../../lib/reportMeta';
import { useReturnState } from '../../hooks/useReturnTo';
import { useAdminDashboard } from '../../hooks/useDashboard';
import { useScope } from '../../hooks/useScope';
import { useAppReducedMotion } from '../../hooks/useAppReducedMotion';
import { reducedVariants } from '../../lib/motion';
import { formatLastFirstName } from '../../utils/formatName';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend, ChartDataLabels);

const CHART_PALETTE = ['#0041c9', '#1e9e5a', '#f4a51e', '#f4841e', '#5b3ec9', '#c4384a'];

const DOUGHNUT_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    datalabels: {
      color: '#fff',
      font: { weight: 'bold' as const, size: 13 },
      formatter: (value: number, ctx: Context) => {
        const dataset = (ctx.chart.data.datasets[0].data as number[]);
        const total = dataset.reduce((sum, v) => sum + v, 0);
        return total > 0 ? `${Math.round((value / total) * 100)}%` : '0%';
      },
    },
  },
};

const EMPTY_DASHBOARD: AdminDashboardData = {
  stats: { total_alumni: 0, total_batches: 0, new_registrations: 0, active_alumni: 0, archived_alumni: 0 },
  recent_alumni: [],
  batch_chart: { labels: [], data: [] },
  gender_chart: { labels: [], data: [] },
  recent_activity: [],
  recent_reports: [],
};

function AdminDashboardPage() {
  const { schoolId: selectedSchoolId } = useScope();
  const {
    data = EMPTY_DASHBOARD,
    isLoading,
    isFetching,
    isPlaceholderData,
  } = useAdminDashboard(selectedSchoolId);
  const returnState = useReturnState('Dashboard');
  const hasGenderData = Array.isArray(data.gender_chart.data) && data.gender_chart.data.some((value) => value > 0);
  const prefersReducedMotion = useAppReducedMotion();

  // The activity feed renders a fixed-height block once it has history rows; match
  // the reports list to that height so the two panels in this row line up.
  const activityHasHistory = (Array.isArray(data.recent_activity) ? data.recent_activity.length : 0) > 2;

  const staggerContainerVariants = useMemo(
    () => reducedVariants.staggerContainer(prefersReducedMotion, 3),
    [prefersReducedMotion],
  );
  const listItemVariants = useMemo(
    () => reducedVariants.listItem(prefersReducedMotion),
    [prefersReducedMotion],
  );

  if (isLoading) {
    return <AdminDashboardLoadingState />;
  }

  const isUpdating = isFetching && isPlaceholderData;

  return (
    <div className="p-6" aria-busy={isUpdating}>
      {isUpdating && (
        <div
          className="mb-4 rounded-lg border border-accent/20 bg-accent/5 px-3 py-2 text-label-md text-accent"
          role="status"
          aria-live="polite"
        >
          Updating dashboard for the selected school…
        </div>
      )}
      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-5"
      >
        <motion.div variants={listItemVariants}>
          <StatCard label="Total Alumni" value={data.stats.total_alumni} icon={Users} tone="blue" appearance="dashboard" />
        </motion.div>
        <motion.div variants={listItemVariants}>
          <StatCard label="Total Batches" value={data.stats.total_batches} icon={GraduationCap} tone="green" appearance="dashboard" />
        </motion.div>
        <motion.div variants={listItemVariants}>
          <StatCard label="New Registrations" value={data.stats.new_registrations} icon={UserPlus} tone="purple" appearance="dashboard" />
        </motion.div>
        <motion.div variants={listItemVariants}>
          <StatCard label="Active Alumni" value={data.stats.active_alumni} icon={UserCheck} tone="amber" appearance="dashboard" />
        </motion.div>
        <motion.div variants={listItemVariants}>
          <StatCard label="Archived/Legacy Alumni" value={data.stats.archived_alumni} icon={Archive} tone="gray" appearance="dashboard" />
        </motion.div>
      </motion.div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DashboardPanel
          title="Recent Alumni"
          headingId="recent-alumni-heading"
          action={<Link to="/alumni" className="text-label-md font-label-md text-accent hover:text-accent-hover">View All</Link>}
          className="lg:col-span-2"
        >
          {Array.isArray(data.recent_alumni) && data.recent_alumni.length > 0 ? (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-lg">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low text-left text-label-sm text-on-surface-variant">
                    <th className="whitespace-nowrap px-2 pb-2 pt-2">Name</th>
                    <th className="whitespace-nowrap px-2 pb-2 pt-2">Batch</th>
                    <th className="whitespace-nowrap px-2 pb-2 pt-2">School</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_alumni.map((alumni) => (
                    <tr key={alumni.id} className="border-b border-outline-variant text-body-md">
                      <td className="whitespace-nowrap px-2 py-2">
                        <Link to={`/alumni?view=${alumni.id}`} state={returnState} className="text-accent hover:text-accent-hover">{formatLastFirstName(alumni)}</Link>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-on-surface-variant">{alumni.graduation_year}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-on-surface-variant">{alumni.school || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No alumni yet" description="Recently registered alumni will appear here." icon={Users} />
          )}
        </DashboardPanel>

        <DashboardPanel title="Graduates Per Year" headingId="graduates-per-year-heading" className="flex h-full flex-col">
          <div className="mt-3 min-h-48 flex-1">
            <Bar
              data={{ labels: Array.isArray(data.batch_chart.labels) ? data.batch_chart.labels.map(String) : [], datasets: [{ label: 'Graduates', data: Array.isArray(data.batch_chart.data) ? data.batch_chart.data : [], backgroundColor: '#1476d6' }] }}
              options={{ responsive: true, maintainAspectRatio: false, plugins: { datalabels: { display: false } } }}
            />
          </div>
          <ul className="sr-only" aria-label="Graduates per year data">
            {data.batch_chart.labels.map((label, index) => (
              <li key={label}>{label}: {data.batch_chart.data[index] ?? 0} graduates</li>
            ))}
          </ul>
        </DashboardPanel>

        <DashboardPanel title="Gender Distribution" headingId="gender-distribution-heading" className="self-start">
          {hasGenderData ? (
            <div className="mt-3 grid grid-cols-1 items-center justify-items-center gap-6 desktop:grid-cols-[minmax(0,0.9fr)_auto_minmax(0,1.1fr)] desktop:gap-8">
              <div className="hidden desktop:block" aria-hidden="true" />
              <div className="flex min-h-[17rem] items-center justify-center">
                <div className="h-56 w-56 shrink-0">
                  <Doughnut
                    data={{ labels: data.gender_chart.labels, datasets: [{ data: data.gender_chart.data, backgroundColor: CHART_PALETTE, borderWidth: 0 }] }}
                    options={DOUGHNUT_OPTIONS}
                  />
                </div>
              </div>
              <div className="desktop:justify-self-start">
                <DoughnutLegend
                  labels={data.gender_chart.labels}
                  data={data.gender_chart.data}
                  colors={CHART_PALETTE}
                  markerShape="circle"
                />
              </div>
            </div>
          ) : (
            <EmptyState title="No data available" description="Gender distribution will appear here once alumni are registered." icon={PieChart} />
          )}
        </DashboardPanel>

        <DashboardPanel title="Recent Activity" headingId="recent-activity-heading" className="self-start">
          <ActivityFeed activities={Array.isArray(data.recent_activity) ? data.recent_activity : []} />
        </DashboardPanel>

        <DashboardPanel title="Recent Reports" headingId="recent-reports-heading" className="self-start">
          {Array.isArray(data.recent_reports) && data.recent_reports.length > 0 ? (
            <div className={`mt-3 space-y-2${activityHasHistory ? ' desktop:h-52 desktop:overflow-y-auto desktop:pr-1' : ''}`}>
              {data.recent_reports.map((r) => {
                const meta = REPORT_TYPE_META[r.report_type] ?? DEFAULT_REPORT_META;
                const Icon = meta.icon;
                return (
                  <Link
                    key={r.id}
                    to={`/reports?preview=${r.id}`}
                    state={returnState}
                    className="group flex items-center gap-3 rounded-lg border border-outline-variant/70 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-card"
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${TONE_CLASSES[meta.tone]}`}>
                      <Icon size={18} aria-hidden="true" strokeWidth={2.25} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-label-md font-label-md text-on-surface" title={r.title}>{r.title}</p>
                      <span className="mt-0.5 inline-block rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant">
                        {formatReportType(r.report_type)}
                      </span>
                    </div>
                    <ChevronRight
                      size={16}
                      className="shrink-0 text-on-surface-variant opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                      aria-hidden="true"
                    />
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No reports generated yet" description="Reports you create will show up here." icon={FileText} />
          )}
        </DashboardPanel>
      </div>

      <div className="mt-6">
        <QuickActions schoolId={selectedSchoolId} />
      </div>
    </div>
  );
}

export default AdminDashboardPage;
