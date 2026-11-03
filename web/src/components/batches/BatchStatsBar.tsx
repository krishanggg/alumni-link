import { Users, UserCheck, ClipboardCheck } from 'lucide-react';
import { StatCard } from '../shared/StatCard';

interface BatchStatsBarProps { total: number; registrationProgress?: number | null; profileCompleteness?: number | null; }

export function BatchStatsBar({ total, registrationProgress, profileCompleteness }: BatchStatsBarProps) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
    <StatCard label="Total Graduates" value={total} icon={Users} tone="blue" />
    <StatCard
      label="Registration Progress"
      value={registrationProgress != null ? `${registrationProgress}%` : '—'}
      hint="Share of this batch's graduates who have created an account, whether or not their profile is finished."
      icon={UserCheck}
      tone="purple"
    />
    <StatCard
      label="Profile Completeness"
      value={profileCompleteness != null ? `${profileCompleteness}%` : '—'}
      hint="Share of the registered graduates whose profile has the key details filled in (name and section/strand)."
      icon={ClipboardCheck}
      tone="amber"
    />
  </div>;
}
