import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Search } from 'lucide-react';

import type { SearchSuggestion } from '../../types/Search';

import { Spinner } from '../shared/Spinner';

import { formatLastFirstName } from '../../utils/formatName';

interface SearchBarProps {
  value: string;
  suggestions: SearchSuggestion[];
  isLoading: boolean;
  placeholder?: string;
  ariaLabel?: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: SearchSuggestion) => void;
}

const SUGGESTIONS_LIST_ID = 'search-suggestions-list';

export function SearchBar({
  value, suggestions, isLoading, placeholder, ariaLabel, onChange, onSelect,
}: SearchBarProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasSuggestions = showSuggestions && suggestions.length > 0;

  function handleChange(val: string) {
    onChange(val);
    setActiveIndex(-1);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setShowSuggestions(val.trim().length >= 2);
    }, 300);
  }

  function closeSuggestions() {
    setShowSuggestions(false);
    setActiveIndex(-1);
  }

  function selectSuggestion(suggestion: SearchSuggestion) {
    onSelect(suggestion);
    closeSuggestions();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!hasSuggestions) {
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
      return;
    }

    if (e.key === 'Enter' && activeIndex >= 0 && activeIndex < suggestions.length) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
      return;
    }

    if (e.key === 'Escape') {
      closeSuggestions();
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeSuggestions();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const inputId = 'search-input';
  const label = ariaLabel || 'Search';

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={inputId} className="sr-only">{label}</label>
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" aria-hidden="true" />
        <input
          id={inputId}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={hasSuggestions ? 'true' : 'false'}
          aria-controls={SUGGESTIONS_LIST_ID}
          aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
          aria-busy={isLoading ? 'true' : undefined}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || 'Search'}
          className="w-full rounded-DEFAULT border border-outline-variant py-2 pl-9 pr-3 text-body-md focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
        {isLoading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant" role="status">
            <span className="sr-only">Loading</span>
            <Spinner className="h-4 w-4" />
          </span>
        )}
      </div>

      {hasSuggestions && (
        <ul
          id={SUGGESTIONS_LIST_ID}
          role="listbox"
          className="absolute z-10 mt-1 w-full rounded-DEFAULT border border-outline-variant bg-white shadow-lg max-h-48 overflow-y-auto"
        >
          {suggestions.map((s, index) => (
            <li
              key={s.id}
              id={`suggestion-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={`cursor-pointer px-3 py-2 text-body-md ${index === activeIndex ? 'bg-surface-container' : 'hover:bg-surface-container'}`}
              onClick={() => selectSuggestion(s)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <span className="text-on-surface">{formatLastFirstName(s)}</span>
              <span className="ml-2 text-label-sm text-on-surface-variant">
                Batch {s.graduation_year}{s.section_strand ? ` - ${s.section_strand}` : ''}{s.student_id ? ` - ${s.student_id}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
