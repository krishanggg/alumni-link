import { useRef, useState } from 'react';
import { AlertTriangle, GraduationCap, Hash, Link2, Search, UserX } from 'lucide-react';

import type { SearchSuggestion } from '../../types/Search';

import { Avatar } from '../shared/Avatar';
import { EmptyState } from '../shared/EmptyState';
import { Spinner } from '../shared/Spinner';
import { Button } from '../shared/Button';
import { InlineConfirm } from '../shared/InlineConfirm';
import { HighlightedName } from '../shared/HighlightedName';

import { AlumniService } from '../../services/AlumniService';
import { formatFullName } from '../../utils/formatName';
import { alumniNameMatchesUser } from '../../utils/nameMatch';
import { TONE_CLASSES } from '../../lib/toneClasses';

interface AlumniSearchPickerProps {
  targetUserName: string;
  onSelect: (alumni: SearchSuggestion) => Promise<void> | void;
  selectLabel?: string;
}

export function AlumniSearchPicker({ targetUserName, onSelect, selectLabel = 'Link' }: AlumniSearchPickerProps) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SearchSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [pendingLink, setPendingLink] = useState<SearchSuggestion | null>(null);
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trimmedSearch = search.trim();

  function handleSearchChange(value: string) {
    setSearch(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setHasSearched(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setError('');

    debounceRef.current = setTimeout(async () => {
      try {
        const data = await AlumniService.fetchAlumniSuggestions(trimmed, { unlinkedOnly: true });
        setResults(data);
      } catch {
        setError('Search failed. Please try again.');
      } finally {
        setIsSearching(false);
        setHasSearched(true);
      }
    }, 300);
  }

  async function handleSelect(alumni: SearchSuggestion) {
    setIsSelecting(true);
    setError('');

    try {
      await onSelect(alumni);
      setResults([]);
      setSearch('');
      setPendingLink(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link');
    } finally {
      setIsSelecting(false);
    }
  }

  function handleResultClick(alumni: SearchSuggestion) {
    if (!alumniNameMatchesUser(targetUserName, alumni.first_name, alumni.last_name)) {
      setPendingLink(alumni);
      return;
    }

    void handleSelect(alumni);
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-label-sm text-error" role="alert">{error}</p>
      )}

      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" aria-hidden="true" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by name or student ID"
          disabled={!!pendingLink}
          className="w-full rounded-DEFAULT border border-outline-variant py-2 pl-9 pr-3 text-body-md focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:bg-surface-container-low disabled:opacity-60"
        />
        {isSearching && (
          <Spinner className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
        )}
      </div>

      {pendingLink && (
        <InlineConfirm
          message={<><HighlightedName>{formatFullName(pendingLink)}</HighlightedName> doesn't match <HighlightedName>{targetUserName}</HighlightedName>. Link them anyway?</>}
          confirmLabel="Link Anyway"
          loadingLabel="Linking"
          isLoading={isSelecting}
          onConfirm={() => handleSelect(pendingLink)}
          onCancel={() => setPendingLink(null)}
        />
      )}

      {!pendingLink && trimmedSearch.length < 2 && !hasSearched && (
        <EmptyState
          icon={Search}
          title="Search to find a match"
          description="Type at least 2 characters. A name or student ID will work."
        />
      )}

      {!pendingLink && hasSearched && !isSearching && results.length === 0 && (
        <EmptyState
          icon={UserX}
          title="No matching alumni found"
          description="Try a different spelling, or check the Alumni Directory to confirm the record exists."
        />
      )}

      {!pendingLink && results.length > 0 && (
        <ul className="divide-y divide-outline-variant rounded-DEFAULT border border-outline-variant">
          {results.map((alumni) => (
            <li key={alumni.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-container-low">
              <Avatar name={`${alumni.first_name} ${alumni.last_name}`} sizeClassName="h-9 w-9" toneClassName={TONE_CLASSES.blue} textClassName="text-label-sm font-label-sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-md font-label-md text-on-surface">
                  {formatFullName(alumni)}
                </p>
                <div className="flex items-center gap-3 text-label-sm text-on-surface-variant">
                  <span className="flex items-center gap-1 whitespace-nowrap">
                    <GraduationCap size={12} aria-hidden="true" />
                    Batch {alumni.graduation_year}
                  </span>
                  {alumni.student_id && (
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <Hash size={12} aria-hidden="true" />
                      {alumni.student_id}
                    </span>
                  )}
                </div>
                {!alumniNameMatchesUser(targetUserName, alumni.first_name, alumni.last_name) && (
                  <p className="mt-1 flex items-center gap-1 text-label-sm text-on-warning-container">
                    <AlertTriangle size={12} aria-hidden="true" />
                    Doesn&apos;t match &quot;{targetUserName}&quot;
                  </p>
                )}
              </div>
              <Button variant="ghost" size="sm" icon={Link2} onClick={() => handleResultClick(alumni)} disabled={isSelecting} className="shrink-0">
                {selectLabel}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
