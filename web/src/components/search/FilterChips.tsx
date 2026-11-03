import type { SearchFilters } from '../../types/Search';

const USER_FACING_KEYS: (keyof SearchFilters)[] = ['q', 'graduation_year', 'section', 'gender'];

const FILTER_LABELS: Record<string, (v: unknown) => string> = {
  graduation_year: (v) => `Year: ${(v as number[]).join(', ')}`,
  section: (v) => `Section: ${(v as string[]).join(', ')}`,
  gender: (v) => `Gender: ${v as string}`,
  q: (v) => `Search: ${v as string}`,
};

interface FilterChipsProps {
  filters: SearchFilters;
  onRemove: (key: keyof SearchFilters) => void;
}

export function FilterChips({ filters, onRemove }: FilterChipsProps) {
  const activeFilters = Object.entries(filters).filter(
    ([key, val]) => USER_FACING_KEYS.includes(key as keyof SearchFilters) && val !== undefined && val !== '' && (!Array.isArray(val) || val.length > 0)
  );

  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div className="relative z-20 flex flex-wrap gap-2">
      {activeFilters.map(([key, val]) => (
        <span key={key} className="inline-flex items-center gap-1 rounded-full bg-primary-fixed px-3 py-1 text-label-sm text-on-primary-fixed-variant">
          {FILTER_LABELS[key] ? FILTER_LABELS[key](val) : `${key}: ${String(val)}`}
          <button
            type="button"
            onClick={() => onRemove(key as keyof SearchFilters)}
            className="ml-1 text-on-primary-fixed-variant hover:text-on-primary-fixed"
            aria-label={`Remove ${key} filter`}
          >
            x
          </button>
        </span>
      ))}
    </div>
  );
}
