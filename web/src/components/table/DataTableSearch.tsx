import { useState, useEffect, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';

import { useDebouncedValue } from '../../hooks/useDebouncedValue';

interface DataTableSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  appearance?: 'default' | 'flat';
  /** A refetch driven by this search is in flight (server-backed tables). */
  isFetching?: boolean;
}

export function DataTableSearch({ value, onChange, placeholder: placeholderProp, ariaLabel, appearance = 'default', isFetching = false }: DataTableSearchProps) {
  const [localValue, setLocalValue] = useState(value);
  const debouncedValue = useDebouncedValue(localValue, 300);
  const isMountedRef = useRef(false);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }

    onChange(debouncedValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only fire on debounced value change
  }, [debouncedValue]);

  const placeholder = placeholderProp ?? 'Search';
  // The field is "settling" between a keystroke and the debounced commit; show
  // a spinner so a search always has immediate visible feedback, even when the
  // filtering itself is instant (client-side) once it lands.
  const isSettling = localValue !== debouncedValue || debouncedValue !== value;
  const showSpinner = isSettling || isFetching;

  return (
    <div className="relative w-full sm:w-auto sm:shrink-0">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" aria-hidden="true" />
      <input
        type="text"
        // `size` sizes the field to roughly this many characters; a few extra
        // over the placeholder length leaves comfortable trailing room so the
        // placeholder is never clipped. `w-full` still wins on mobile.
        size={placeholder.length + 5}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        aria-busy={showSpinner ? 'true' : undefined}
        className={`w-full ${appearance === 'flat' ? 'rounded-sm' : 'rounded-DEFAULT'} border border-outline-variant bg-white py-2 pl-9 pr-9 text-body-md transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 sm:w-auto sm:min-w-[13rem] sm:max-w-full`}
      />
      {showSpinner && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant" role="status" aria-hidden="true">
          <Loader2 size={16} className="animate-spin" />
        </span>
      )}
    </div>
  );
}
