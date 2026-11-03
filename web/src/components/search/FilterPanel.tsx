import type { SearchFilters, FilterOptions } from '../../types/Search';
import { Checkbox } from '../shared/Checkbox';
import { RadioGroup } from '../shared/RadioGroup';

interface FilterPanelProps {
  filters: SearchFilters;
  filterOptions: FilterOptions;
  scope: 'admin' | 'directory';
  onChange: (filters: Partial<SearchFilters>) => void;
}

interface CheckboxFilterGroupProps<T extends string | number> {
  idPrefix: string;
  label: string;
  options: T[];
  selected: T[];
  onChange: (selected: T[] | undefined) => void;
}

function CheckboxFilterGroup<T extends string | number>({ idPrefix, label, options, selected, onChange }: CheckboxFilterGroupProps<T>) {
  const toggle = (option: T, checked: boolean) => {
    const next = checked ? [...selected, option] : selected.filter((value) => value !== option);
    onChange(next.length > 0 ? next : undefined);
  };

  return (
    <fieldset>
      <legend className="text-label-md font-label-md text-on-surface">{label}</legend>
      {options.length === 0 ? (
        <p className="mt-1.5 text-body-md text-on-surface-variant">No options available.</p>
      ) : (
        <div className="thin-scrollbar mt-1.5 max-h-40 space-y-2 overflow-y-auto rounded-DEFAULT border border-outline-variant bg-white px-3 py-2">
          {options.map((option) => (
            <Checkbox
              key={option}
              id={`${idPrefix}-${option}`}
              label={String(option)}
              checked={selected.includes(option)}
              onChange={(event) => toggle(option, event.target.checked)}
            />
          ))}
        </div>
      )}
    </fieldset>
  );
}

export function FilterPanel({ filters, filterOptions, scope, onChange }: FilterPanelProps) {
  return (
    <div className="flex min-h-0 max-h-full flex-1 flex-col overflow-hidden rounded-lg border border-outline-variant/70 bg-white shadow-card">
      <div className="shrink-0 border-b border-outline-variant/70 bg-surface-container-low px-4 py-3">
        <h2 className="text-headline-sm font-headline-sm text-on-surface">Filter alumni</h2>
        <p className="mt-0.5 text-label-sm text-on-surface-variant">Refine the records shown in this table.</p>
      </div>

      <div className="thin-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
      <CheckboxFilterGroup
        idPrefix="filter-graduation-year"
        label="Graduation Year"
        options={filterOptions.graduation_years}
        selected={filters.graduation_year || []}
        onChange={(selected) => onChange({ graduation_year: selected })}
      />

      <CheckboxFilterGroup
        idPrefix="filter-section"
        label="Section / Strand"
        options={filterOptions.sections}
        selected={filters.section || []}
        onChange={(selected) => onChange({ section: selected })}
      />

      {scope === 'admin' && (
        <RadioGroup
          name="filter-gender"
          label="Gender"
          value={filters.gender}
          options={filterOptions.genders.map((g) => ({ value: g, label: g }))}
          onChange={(value) => onChange({ gender: value })}
          allowUnset
        />
      )}

      <div className="flex justify-end border-t border-outline-variant/70 pt-3">
        <button
          type="button"
          onClick={() => onChange({ graduation_year: undefined, section: undefined, gender: undefined })}
          className="rounded-DEFAULT px-3 py-1.5 text-label-sm font-label-sm text-accent hover:bg-accent/10 hover:text-accent-hover"
        >
          Clear all
        </button>
      </div>
      </div>
    </div>
  );
}
