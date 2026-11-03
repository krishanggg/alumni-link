import { useState } from 'react';
import { Modal } from '../shared/Modal';
import { CountdownTimer } from '../shared/CountdownTimer';
import { Button } from '../shared/Button';
import { ANNOUNCEMENT_ICONS, ANNOUNCEMENT_ICON_TONE, ANNOUNCEMENT_TYPE_LABELS, batchReference } from './announcementDisplay';
import type { Announcement } from '../../types/Announcement';

interface AnnouncementModalProps {
  queue: Announcement[];
  onGotIt: (id: number) => Promise<void>;
}

export function AnnouncementModal({ queue, onGotIt }: AnnouncementModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const current = queue[0];

  if (!current) {
    return null;
  }

  async function handleGotIt() {
    setIsSubmitting(true);

    try {
      await onGotIt(current.id);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={handleGotIt}
      title={current.title}
      icon={ANNOUNCEMENT_ICONS[current.type]}
      tone={ANNOUNCEMENT_ICON_TONE[current.type]}
      size="md"
      closeOnBackdropClick={false}
      footer={
        <Button onClick={handleGotIt} isLoading={isSubmitting} loadingText="Saving">
          Got it
        </Button>
      }
    >
      <p className="text-overline font-overline uppercase text-on-surface-variant">
        {ANNOUNCEMENT_TYPE_LABELS[current.type]}
      </p>
      <p className="mt-2 whitespace-pre-wrap text-body-md text-on-surface">{current.message}</p>

      {current.type === 'event' && current.target_date && (
        <div className="mt-4">
          <CountdownTimer targetDate={current.target_date} />
        </div>
      )}

      <p className="mt-4 text-label-sm text-on-surface-variant">{batchReference(current)}</p>
    </Modal>
  );
}
