import { useId } from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  id?: string;
}

export function Switch({ checked, onChange, label, description, disabled = false, id }: SwitchProps) {
  const generatedId = useId();
  const switchId = id ?? generatedId;
  const labelId = label ? switchId + '-label' : undefined;
  const descriptionId = label && description ? switchId + '-description' : undefined;

  const toggle = (
    <button
      id={switchId}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelId}
      aria-describedby={descriptionId}
      aria-label={label ? undefined : 'Toggle'}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${
        checked ? 'bg-accent' : 'bg-surface-container-high'
      } ${disabled ? 'cursor-not-allowed opacity-50' : checked ? 'hover:bg-accent-hover' : 'hover:bg-surface-container-highest'}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-pop ring-0 transition duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );

  if (!label) {
    return toggle;
  }

  return (
    <div className="flex items-center justify-between py-3">
      <div className="pr-4">
        <p id={labelId} className="text-body-md font-label-md text-on-surface">{label}</p>
        {description && <p id={descriptionId} className="text-body-sm text-on-surface-variant">{description}</p>}
      </div>
      {toggle}
    </div>
  );
}
