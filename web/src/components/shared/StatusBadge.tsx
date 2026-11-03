import {
  Archive,
  CheckCircle2,
  CircleDot,
  CircleSlash,
  Clock,
  FileEdit,
  Globe,
  Lock,
  ShieldCheck,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  /** Show a small leading icon for statuses that have one mapped. */
  withIcon?: boolean;
}

const COLORS: Record<string, string> = {
  draft: 'bg-surface-container-high text-on-surface-variant',
  unpublished: 'bg-surface-container-high text-on-surface-variant',
  published: 'bg-success-container text-on-success-container',
  expired: 'bg-error-container text-on-error-container',
  archived: 'bg-surface-container-high text-on-surface-variant',
  active: 'bg-success-container text-on-success-container',
  inactive: 'bg-surface-container-high text-on-surface-variant',
  admin: 'bg-primary-fixed text-on-primary-fixed-variant',
  super_admin: 'bg-primary-fixed text-on-primary-fixed-variant',
  school_admin: 'bg-secondary-fixed text-on-secondary-fixed-variant',
  alumni: 'bg-surface-container-highest text-on-surface-variant',
  pending: 'bg-warning-container text-on-warning-container',
  approved: 'bg-success-container text-on-success-container',
  rejected: 'bg-error-container text-on-error-container',
  employed: 'bg-success-container text-on-success-container',
  unemployed: 'bg-error-container text-on-error-container',
  'self-employed': 'bg-success-container text-on-success-container',
  studying: 'bg-secondary-container/20 text-secondary',
  student: 'bg-secondary-container/20 text-secondary',
  searching: 'bg-warning-container text-on-warning-container',
  open: 'bg-info-container text-on-info-container',
  resolved: 'bg-success-container text-on-success-container',
  unknown: 'bg-surface-container-high text-on-surface-variant',
  public: 'bg-success-container text-on-success-container',
  private: 'bg-error-container text-on-error-container',
};

// Curated: lifecycle, moderation, role and privacy states where an icon adds
// clarity. Statuses left out (job status, etc.) render label-only even with
// withIcon set.
const ICONS: Record<string, LucideIcon> = {
  draft: FileEdit,
  unpublished: FileEdit,
  published: CheckCircle2,
  expired: XCircle,
  archived: Archive,
  active: CheckCircle2,
  inactive: CircleSlash,
  pending: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
  admin: ShieldCheck,
  super_admin: ShieldCheck,
  school_admin: ShieldCheck,
  public: Globe,
  private: Lock,
  open: CircleDot,
  resolved: CheckCircle2,
  unknown: CircleDot,
};

export function StatusBadge({ status, withIcon = false }: StatusBadgeProps) {
  const Icon = withIcon ? ICONS[status] : undefined;

  return (
    <span className={`inline-flex whitespace-nowrap items-center gap-1 rounded-sm px-2 py-0.5 text-label-sm font-label-sm ${COLORS[status] || COLORS.draft}`}>
      {Icon && <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />}
      {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}
    </span>
  );
}
