import { FileText, LayoutGrid, ListChecks, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';

import { TONE_CLASSES } from '../../lib/toneClasses';

export interface QuickActionsProps {
  schoolId?: number;
}

function scopedPath(path: string, schoolId?: number): string {
  return schoolId ? `${path}?school_id=${schoolId}` : path;
}

export function QuickActions({ schoolId }: QuickActionsProps) {
  return (
    <section aria-labelledby="quick-actions-heading">
      <h2 id="quick-actions-heading" className="text-headline-sm font-headline-sm text-on-surface">Quick Actions</h2>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link to={scopedPath('/alumni/new', schoolId)} className="flex items-center gap-3 rounded-DEFAULT border border-outline-variant/70 bg-white p-4 shadow-card transition-colors motion-reduce:transition-none hover:bg-surface-container">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-fixed text-secondary">
            <UserPlus size={20} aria-hidden="true" />
          </span>
          <span>
            <span className="block text-label-md font-label-md text-on-surface">Add New Alumni</span>
            <span className="block text-label-sm text-on-surface-variant">Register a new alumni</span>
          </span>
        </Link>
        <Link to={scopedPath('/alumni', schoolId)} className="flex items-center gap-3 rounded-DEFAULT border border-outline-variant/70 bg-white p-4 shadow-card transition-colors motion-reduce:transition-none hover:bg-surface-container">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-container text-on-success-container">
            <ListChecks size={20} aria-hidden="true" />
          </span>
          <span>
            <span className="block text-label-md font-label-md text-on-surface">Alumni List</span>
            <span className="block text-label-sm text-on-surface-variant">View all alumni records</span>
          </span>
        </Link>
        <Link to={scopedPath('/batches', schoolId)} className="flex items-center gap-3 rounded-DEFAULT border border-outline-variant/70 bg-white p-4 shadow-card transition-colors motion-reduce:transition-none hover:bg-surface-container">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${TONE_CLASSES.purple}`}>
            <LayoutGrid size={20} aria-hidden="true" />
          </span>
          <span>
            <span className="block text-label-md font-label-md text-on-surface">Batch Tracking</span>
            <span className="block text-label-sm text-on-surface-variant">View alumni by batch</span>
          </span>
        </Link>
        <Link to={scopedPath('/reports', schoolId)} className="flex items-center gap-3 rounded-DEFAULT border border-outline-variant/70 bg-white p-4 shadow-card transition-colors motion-reduce:transition-none hover:bg-surface-container">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${TONE_CLASSES.amber}`}>
            <FileText size={20} aria-hidden="true" />
          </span>
          <span>
            <span className="block text-label-md font-label-md text-on-surface">Generate Report</span>
            <span className="block text-label-sm text-on-surface-variant">Create and print reports</span>
          </span>
        </Link>
      </div>
    </section>
  );
}
