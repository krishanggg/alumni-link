import {
  Activity, CheckCircle2, Eye, LogIn, Pencil, Plus, Trash2, type LucideIcon,
} from 'lucide-react';

import type { AdminDashboardData } from '../../types/Dashboard';

import { EmptyState } from '../shared/EmptyState';

import { type Tone, TONE_CLASSES, TONE_SURFACE_CLASSES } from '../../lib/toneClasses';

export type DashboardActivity = AdminDashboardData['recent_activity'][number];

export interface ActivityFeedProps {
  activities: DashboardActivity[];
}

// The task contract requires this mapping to be exported here for direct unit testing.
// eslint-disable-next-line react-refresh/only-export-components
export function getActivityMeta(action: string): { icon: LucideIcon; tone: Tone } {
  if (action.includes('deleted') || action.includes('failed')) {
    return { icon: Trash2, tone: 'red' };
  }
  if (action.includes('created')) {
    return { icon: Plus, tone: 'green' };
  }
  if (action.includes('login')) {
    return { icon: LogIn, tone: 'blue' };
  }
  if (action.includes('published') || action.includes('completed')) {
    return { icon: CheckCircle2, tone: 'blue' };
  }
  if (action.includes('updated') || action.includes('changed')) {
    return { icon: Pencil, tone: 'amber' };
  }
  if (action.includes('viewed')) {
    return { icon: Eye, tone: 'purple' };
  }
  return { icon: Activity, tone: 'gray' };
}

function ActivityContent({ activity }: { activity: DashboardActivity }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-body-md text-on-surface">{activity.description}</p>
      <p className="mt-1 text-label-sm text-on-surface-variant">{activity.user} &middot; {activity.timestamp}</p>
    </div>
  );
}

function ActivityRow({ activity }: { activity: DashboardActivity }) {
  const { icon: Icon, tone } = getActivityMeta(activity.action);

  return (
    <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TONE_CLASSES[tone]}`}>
        <Icon size={14} aria-hidden="true" strokeWidth={2.25} />
      </span>
      <ActivityContent activity={activity} />
    </li>
  );
}

function FeaturedActivity({ activity, className = '' }: { activity: DashboardActivity; className?: string }) {
  const { icon: Icon, tone } = getActivityMeta(activity.action);

  return (
    <article className={`flex min-w-0 items-center gap-4 rounded-DEFAULT border p-6 ${TONE_SURFACE_CLASSES[tone]} ${className}`}>
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md ${TONE_CLASSES[tone]}`}>
        <Icon size={20} aria-hidden="true" strokeWidth={2.25} />
      </span>
      <ActivityContent activity={activity} />
    </article>
  );
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <EmptyState
        title="No recent activity"
        description="Actions taken across the system will appear here."
        icon={Activity}
      />
    );
  }

  // A single activity doesn't warrant the featured-card treatment; a lone tinted
  // block just reads as empty space. Render it as one plain row instead.
  if (activities.length === 1) {
    return (
      <ol className="mt-3">
        <ActivityRow activity={activities[0]} />
      </ol>
    );
  }

  const featured = activities.slice(0, 2);
  const history = activities.slice(2);

  // Two activities, nothing to rule off as history: just stack the featured pair.
  if (history.length === 0) {
    return (
      <div className="mt-3 flex flex-col gap-4">
        {featured.map((activity, index) => (
          <FeaturedActivity key={`${activity.action}-${activity.timestamp}-${index}`} activity={activity} />
        ))}
      </div>
    );
  }

  // Two fixed-height featured cards define a compact block; the history column is
  // capped to the same height and scrolls. This keeps the panel a predictable
  // size so it lines up with "Recent Reports" in the same row.
  return (
    <div className="mt-3 flex flex-col gap-6 desktop:flex-row">
      <div className="flex shrink-0 flex-col gap-4 desktop:basis-[58%]">
        {featured.map((activity, index) => (
          <FeaturedActivity
            key={`${activity.action}-${activity.timestamp}-${index}`}
            activity={activity}
            className="desktop:h-24"
          />
        ))}
      </div>

      <section
        aria-label="Activity history"
        className="min-w-0 max-h-52 overflow-y-auto pr-1 desktop:flex-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-outline-variant [&::-webkit-scrollbar-track]:bg-transparent"
      >
        <ol className="divide-y divide-outline-variant/70">
          {history.map((activity, index) => (
            <ActivityRow key={`${activity.action}-${activity.timestamp}-${index}`} activity={activity} />
          ))}
        </ol>
      </section>
    </div>
  );
}
