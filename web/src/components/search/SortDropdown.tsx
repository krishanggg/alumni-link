import { ArrowUpDown } from 'lucide-react';

import type { SearchFilters } from '../../types/Search';
import { SelectField } from '../shared/SelectField';

const SORT_OPTIONS: { value: SearchFilters['sort_by']; label: string }[] = [
  { value: 'name_asc', label: 'Name A-Z' },
  { value: 'name_desc', label: 'Name Z-A' },
  { value: 'year_desc', label: 'Year (Newest)' },
  { value: 'year_asc', label: 'Year (Oldest)' },
  { value: 'date_desc', label: 'Recently Added' },
  { value: 'date_asc', label: 'Oldest Added' },
];

interface SortDropdownProps {
  value: SearchFilters['sort_by'];
  onChange: (sortBy: SearchFilters['sort_by']) => void;
  appearance?: 'default' | 'command';
}

export function SortDropdown({ value, onChange, appearance = 'default' }: SortDropdownProps) {
  return (
    <SelectField
      label="Sort results"
      hideLabel
      icon={ArrowUpDown}
      appearance={appearance}
      value={value || 'name_asc'}
      onChange={(e) => onChange(e.target.value as SearchFilters['sort_by'])}
    >
      {SORT_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </SelectField>
  );
}
