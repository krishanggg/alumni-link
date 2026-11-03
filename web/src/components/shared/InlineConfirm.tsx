import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';

interface InlineConfirmProps {
  message: ReactNode;
  confirmLabel: string;
  loadingLabel: string;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function InlineConfirm({ message, confirmLabel, loadingLabel, isLoading, onConfirm, onCancel }: InlineConfirmProps) {
  return (
    <div className="space-y-3 rounded-DEFAULT border border-error-container bg-error-container/50 p-3">
      <p className="flex items-start gap-2 text-body-md text-on-error-container">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>{message}</span>
      </p>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="rounded-DEFAULT border border-on-error-container/30 bg-white px-4 py-2 text-body-md font-label-md text-on-error-container hover:bg-error-container disabled:opacity-50"
        >
          Cancel
        </button>
        <Button variant="danger-solid" onClick={onConfirm} isLoading={isLoading} loadingText={loadingLabel}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
