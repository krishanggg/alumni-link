import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  lastPage: number;
  onPageChange: (page: number) => void;
  className?: string;
  appearance?: 'default' | 'flat';
  /** Disables all page controls, e.g. while a page change is still in flight. */
  disabled?: boolean;
}

function getPageWindow(current: number, last: number): (number | 'ellipsis')[] {
  if (last <= 7) {
    return Array.from({ length: last }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, last, current, current - 1, current + 1]);
  const sorted = Array.from(pages)
    .filter((p) => p >= 1 && p <= last)
    .sort((a, b) => a - b);

  const result: (number | 'ellipsis')[] = [];
  let prev = 0;
  for (const page of sorted) {
    if (prev && page - prev > 1) {
      result.push('ellipsis');
    }
    result.push(page);
    prev = page;
  }

  return result;
}

export function Pagination({ currentPage, lastPage, onPageChange, className = '', appearance = 'default', disabled = false }: PaginationProps) {
  if (lastPage <= 1) {
    return null;
  }

  const pages = getPageWindow(currentPage, lastPage);

  const buttonRadius = appearance === 'flat' ? 'rounded-sm' : 'rounded-DEFAULT';

  return (
    <nav aria-label="Pagination" className={`flex items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={disabled || currentPage <= 1}
        aria-label="Previous page"
        className={`tap-target ${buttonRadius} p-1.5 text-on-surface-variant hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>

      {pages.map((page, i) =>
        page === 'ellipsis' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-label-sm text-on-surface-variant">
            …
          </span>
        ) : (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            disabled={disabled}
            aria-current={page === currentPage ? 'page' : undefined}
            className={`tap-target ${buttonRadius} px-3 py-1 text-label-sm font-label-sm disabled:cursor-not-allowed disabled:opacity-40 ${
              page === currentPage
                ? 'bg-accent text-on-primary'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            {page}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={disabled || currentPage >= lastPage}
        aria-label="Next page"
        className={`tap-target ${buttonRadius} p-1.5 text-on-surface-variant hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  );
}
