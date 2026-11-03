import { Link } from 'react-router-dom';
import { ArrowUpRight, GraduationCap, Info } from 'lucide-react';

import { DEFAULT_ICON_TONE } from '../../lib/toneClasses';

const REGISTRATION_PROGRESS_HINT = 'Registered accounts as a percentage of the batch roster.';
const PROFILE_COMPLETENESS_HINT = 'Complete registered profiles as a percentage of registered accounts.';

interface BatchCardProps {
  graduationYear: number;
  totalGraduates: number;
  registrationProgress: number | null;
  profileCompleteness: number | null;
  schoolId?: number;
}

export function BatchCard({ graduationYear, totalGraduates, registrationProgress, profileCompleteness, schoolId }: BatchCardProps) {
  return (
    <Link to={`/batches/${graduationYear}${schoolId ? `?school_id=${schoolId}` : ''}`} className="group relative block overflow-hidden rounded-lg border border-outline-variant/70 bg-white p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${DEFAULT_ICON_TONE}`}><GraduationCap size={22} aria-hidden="true" strokeWidth={2.25} /></div>
          <h3 className="text-headline-sm font-headline-sm text-primary">Batch {graduationYear}</h3>
        </div>
        <ArrowUpRight size={18} className="mt-1 shrink-0 text-on-surface-variant opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" aria-hidden="true" />
      </div>
      <div className="relative mt-4 grid grid-cols-1 gap-4 border-t border-outline-variant/70 pt-4 sm:grid-cols-2">
        <div className="min-w-0"><p className="break-words text-label-sm text-on-surface-variant">Graduates</p><p className="mt-1 text-display-md font-display-md tabular-nums text-on-surface">{totalGraduates}</p></div>
        <div className="min-w-0">
          <p className="flex items-center gap-1 break-words text-label-sm text-on-surface-variant">
            Registration Progress
            <span title={REGISTRATION_PROGRESS_HINT}><Info size={13} aria-hidden="true" className="text-outline" /></span>
            <span className="sr-only">{REGISTRATION_PROGRESS_HINT}</span>
          </p>
          <p className="mt-1 text-display-md font-display-md tabular-nums text-on-surface">{registrationProgress !== null ? `${registrationProgress}%` : '—'}</p>
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-1 break-words text-label-sm text-on-surface-variant">
            Profile Completeness
            <span title={PROFILE_COMPLETENESS_HINT}><Info size={13} aria-hidden="true" className="text-outline" /></span>
            <span className="sr-only">{PROFILE_COMPLETENESS_HINT}</span>
          </p>
          <p className="mt-1 text-display-md font-display-md tabular-nums text-on-surface">{profileCompleteness !== null ? `${profileCompleteness}%` : '—'}</p>
        </div>
      </div>
    </Link>
  );
}
