import { Users, GraduationCap, CalendarClock } from 'lucide-react';
import { StatCard } from '../shared/StatCard';

interface DirectoryStatsBannerProps {
  totalAlumni: number;
  batchCount: number;
  mostRecentBatch: number | null;
}

export function DirectoryStatsBanner({ totalAlumni, batchCount, mostRecentBatch }: DirectoryStatsBannerProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard label="Total Alumni" value={totalAlumni} icon={Users} tone="blue" />
      <StatCard label="Batches" value={batchCount} icon={GraduationCap} tone="green" />
      <StatCard label="Most Recent Batch" value={mostRecentBatch || '—'} icon={CalendarClock} tone="purple" />
    </div>
  );
}
