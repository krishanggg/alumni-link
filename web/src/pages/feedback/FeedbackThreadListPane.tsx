import { MessageSquarePlus, RefreshCw, Search } from 'lucide-react';

import type { FeedbackListFilters, FeedbackThreadRecord } from '../../types/Feedback';

import { Button } from '../../components/shared/Button';
import { SelectField } from '../../components/shared/SelectField';
import { DateRangeField } from '../../components/shared/DateRangeField';
import { Spinner } from '../../components/shared/Spinner';
import { TextField } from '../../components/shared/TextField';
import { Pagination } from '../../components/shared/Pagination';
import { FeedbackThreadListItem } from './FeedbackThreadListItem';

interface FeedbackThreadListPaneProps {
  threads: FeedbackThreadRecord[];
  filters: FeedbackListFilters;
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  selectedId: number | null;
  showSchool: boolean;
  canCreate: boolean;
  schools: Array<{ id: number; name: string }>;
  currentPage: number;
  lastPage: number;
  onFiltersChange: (filters: FeedbackListFilters) => void;
  onSelect: (id: number) => void;
  onNewThread: () => void;
  onRetry: () => void;
  onPageChange: (page: number) => void;
}

export function FeedbackThreadListPane({ threads, filters, isLoading, isFetching, error, selectedId, showSchool, canCreate, schools, currentPage, lastPage, onFiltersChange, onSelect, onNewThread, onRetry, onPageChange }: FeedbackThreadListPaneProps) {
  function updateSearch(value: string) {
    onFiltersChange({ ...filters, q: value || undefined });
  }

  function updateStatus(value: string) {
    onFiltersChange({ ...filters, status: value as FeedbackListFilters['status'] });
  }

  function updateDate(key: 'from' | 'to', value: string) {
    onFiltersChange({ ...filters, [key]: value || undefined });
  }

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col border-b border-outline-variant/70 bg-white lg:max-w-md lg:border-b-0 lg:border-r" aria-label="Feedback conversations">
      <div className="shrink-0 space-y-2 border-b border-outline-variant/70 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="min-w-0 truncate text-title-md font-headline-sm text-on-surface">Conversations</h2>
          <div className="flex shrink-0 items-center gap-2">
            {isFetching && !isLoading && <Spinner className="h-4 w-4 text-accent" />}
            {canCreate && <Button size="sm" icon={MessageSquarePlus} onClick={onNewThread}>New conversation</Button>}
          </div>
        </div>
        <TextField label="Search conversations" hideLabel value={filters.q ?? ''} onChange={(event) => updateSearch(event.target.value)} placeholder="Search by subject" icon={Search} className="block w-full rounded-DEFAULT border border-outline-variant bg-white py-1.5 pl-9 pr-3 text-label-sm text-on-surface transition-colors placeholder:text-on-surface-variant focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 hover:border-outline" />
        <div className={`grid gap-1.5 ${showSchool ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <SelectField label="Status" value={filters.status ?? 'open'} onChange={(event) => updateStatus(event.target.value)} className="inline-flex w-full items-center justify-between gap-2 rounded-DEFAULT border border-outline-variant bg-white px-2.5 py-1.5 text-left text-label-sm text-on-surface transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 hover:border-outline">
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="all">All conversations</option>
          </SelectField>
          {showSchool && (
            <SelectField label="School" value={filters.school_id ?? ''} onChange={(event) => onFiltersChange({ ...filters, school_id: event.target.value ? Number(event.target.value) : undefined })} className="inline-flex w-full items-center justify-between gap-2 rounded-DEFAULT border border-outline-variant bg-white px-2.5 py-1.5 text-left text-label-sm text-on-surface transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 hover:border-outline">
              <option value="">All schools</option>
              {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
            </SelectField>
          )}
        </div>
        <DateRangeField
          label="Date range"
          from={filters.from ?? ''}
          to={filters.to ?? ''}
          fromLabel="From"
          toLabel="To"
          onChangeFrom={(value) => updateDate('from', value)}
          onChangeTo={(value) => updateDate('to', value)}
          onChangeRange={(from, to) => onFiltersChange({ ...filters, from: from || undefined, to: to || undefined })}
          containerClassName="w-full"
        />
      </div>

      {error && (
        <div className="m-4 rounded-DEFAULT bg-error-container p-3 text-body-sm text-on-error-container" role="alert">
          <p>{error}</p>
          <Button type="button" size="sm" variant="secondary" icon={RefreshCw} onClick={onRetry} className="mt-3">Retry</Button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center p-8"><Spinner className="h-6 w-6 text-accent" /></div>
        ) : threads.length === 0 ? (
          <p className="p-8 text-center text-body-sm text-on-surface-variant">No feedback conversations match these filters.</p>
        ) : (
          threads.map((thread) => <FeedbackThreadListItem key={thread.id} thread={thread} isSelected={thread.id === selectedId} showSchool={showSchool} onSelect={onSelect} />)
        )}
      </div>
      <div className="flex shrink-0 justify-center border-t border-outline-variant/70 p-3">
        <Pagination currentPage={currentPage} lastPage={lastPage} onPageChange={onPageChange} disabled={isFetching} appearance="flat" />
      </div>
    </section>
  );
}
