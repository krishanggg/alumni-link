interface RadioOption<T extends string> {
  value: T;
  label: string;
}

interface RadioGroupProps<T extends string> {
  name: string;
  label?: string;
  value: T | undefined;
  options: RadioOption<T>[];
  onChange: (value: T | undefined) => void;
  allowUnset?: boolean;
  unsetLabel?: string;
  containerClassName?: string;
}

function pillClassName(isSelected: boolean) {
  return `flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-body-md capitalize transition-colors ${
    isSelected ? 'border-accent bg-accent/10 font-label-md text-accent' : 'border-outline-variant bg-white text-on-surface hover:bg-surface-container-low'
  }`;
}

function RadioDot({ isSelected }: { isSelected: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition-colors duration-fast peer-focus-visible:ring-2 peer-focus-visible:ring-accent/30 peer-focus-visible:ring-offset-1 ${
        isSelected ? 'border-accent' : 'border-outline-variant'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full bg-accent transition-transform duration-fast ${isSelected ? 'scale-100' : 'scale-0'}`} />
    </span>
  );
}

export function RadioGroup<T extends string>({
  name,
  label,
  value,
  options,
  onChange,
  allowUnset = false,
  unsetLabel = 'All',
  containerClassName,
}: RadioGroupProps<T>) {
  return (
    <div className={containerClassName}>
      {label && <p className="block text-label-md font-label-md text-on-surface">{label}</p>}
      <div className={`flex flex-wrap gap-2 ${label ? 'mt-2' : ''}`}>
        {allowUnset && (
          <label className={pillClassName(!value)}>
            <input type="radio" name={name} checked={!value} onChange={() => onChange(undefined)} className="peer sr-only" />
            <RadioDot isSelected={!value} />
            {unsetLabel}
          </label>
        )}
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <label key={option.value} className={pillClassName(isSelected)}>
              <input type="radio" name={name} checked={isSelected} onChange={() => onChange(option.value)} className="peer sr-only" />
              <RadioDot isSelected={isSelected} />
              {option.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}
