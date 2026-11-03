import { useEffect, useId, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { TextField } from './TextField';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: ReactNode;
  message: ReactNode;
  confirmLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
  retryLabel?: string;
  confirmDisabled?: boolean;
  /**
   * For destructive actions with no recovery path (permanent deletes) —
   * requires the user to type this exact word before Confirm enables, so an
   * irreversible action doesn't share the same one-click weight as a
   * reversible one (e.g. archive, deactivate).
   */
  requireTypedConfirmation?: string;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  variant = 'primary',
  onConfirm,
  onCancel,
  isLoading = false,
  error,
  onRetry,
  retryLabel = 'Retry',
  confirmDisabled = false,
  requireTypedConfirmation,
}: ConfirmDialogProps) {
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const typedConfirmationId = `confirm-dialog-typed-confirmation-${useId().replace(/:/g, '')}`;

  useEffect(() => {
    if (isOpen) {
      setTypedConfirmation('');
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const isConfirmDisabled = isLoading || confirmDisabled || (!!requireTypedConfirmation && typedConfirmation !== requireTypedConfirmation);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      icon={variant === 'danger' ? AlertTriangle : HelpCircle}
      tone={variant === 'danger' ? 'red' : 'blue'}
      size="sm"
      dismissible={!isLoading}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger-solid' : 'primary'}
            onClick={onConfirm}
            disabled={isConfirmDisabled}
            isLoading={isLoading}
            loadingText="Processing"
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-body-md text-on-surface-variant">{message}</p>

      {requireTypedConfirmation && (
        <TextField
          containerClassName="mt-4"
          id={typedConfirmationId}
          label={`Type ${requireTypedConfirmation} to confirm`}
          value={typedConfirmation}
          onChange={(e) => setTypedConfirmation(e.target.value)}
          placeholder={requireTypedConfirmation}
          disabled={isLoading}
        />
      )}

      {error && (
        <div className="mt-4 rounded-DEFAULT bg-error-container p-3 text-body-md text-on-error-container" role="alert">
          <p>{error}</p>
          {onRetry && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={onRetry}
              disabled={isLoading}
              isLoading={isLoading}
              loadingText="Retrying"
              className="mt-3"
            >
              {retryLabel}
            </Button>
          )}
        </div>
      )}
    </Modal>
  );
}
