import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { Modal } from '../shared/Modal';
import { SchoolForm } from './SchoolForm';
import type { School } from '../../types/Auth';

interface SchoolFormModalProps {
  school?: School;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; address?: string; contact_number?: string; email?: string; website?: string }) => Promise<void>;
}

export function SchoolFormModal({ school, isOpen, onClose, onSave }: SchoolFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) {
    return null;
  }

  async function handleSubmit(data: { name: string; address?: string; contact_number?: string; email?: string; website?: string }) {
    setIsSubmitting(true);
    setError('');

    try {
      await onSave(data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={school ? 'Edit School' : 'Add School'} icon={Building2} tone="blue" size="lg">
      <SchoolForm
        initialData={school}
        onSubmit={handleSubmit}
        onCancel={onClose}
        isSubmitting={isSubmitting}
        error={error}
      />
    </Modal>
  );
}
