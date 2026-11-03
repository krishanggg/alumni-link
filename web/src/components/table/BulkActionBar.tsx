import type { LucideIcon } from 'lucide-react';

interface BulkActionItem {
  label: string;
  variant?: 'default' | 'danger';
  icon?: LucideIcon;
  onClick: () => void;
}

interface BulkActionBarProps {
  selectedCount: number;
  onClear: () => void;
  isProcessing?: boolean;
  actions: BulkActionItem[];
}

export function BulkActionBar({
  selectedCount,
  onClear,
  isProcessing = false,
  actions,
}: BulkActionBarProps) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-outline-variant bg-accent/5 px-4 py-2">
      <div className="flex items-center gap-3">
        <span className="text-label-md font-label-md text-on-surface">
          {selectedCount} selected
        </span>
        <button
          type="button"
          onClick={onClear}
          disabled={isProcessing}
          className="text-label-sm font-label-sm text-accent hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Clear
        </button>
      </div>
      <div className="flex items-center gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            disabled={isProcessing}
            className={`inline-flex items-center gap-1.5 rounded-DEFAULT px-3 py-1.5 text-label-sm font-label-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              action.variant === 'danger'
                ? 'border border-error text-error hover:bg-error-container'
                : 'border border-accent text-accent hover:bg-accent/10'
            }`}
          >
            {action.icon && <action.icon size={14} aria-hidden="true" />}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
