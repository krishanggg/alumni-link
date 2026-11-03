import { Calendar, Megaphone, AlertTriangle, type LucideIcon } from 'lucide-react';
import type { Tone } from '../../lib/toneClasses';
import type { Announcement } from '../../types/Announcement';

export const ANNOUNCEMENT_ICONS: Record<Announcement['type'], LucideIcon> = {
  event: Calendar,
  general: Megaphone,
  closure: AlertTriangle,
};

export const ANNOUNCEMENT_ICON_TONE: Record<Announcement['type'], Tone> = {
  event: 'blue',
  general: 'gray',
  closure: 'red',
};

export const ANNOUNCEMENT_BANNER_CLASSES: Record<Announcement['type'], string> = {
  event: 'bg-primary-fixed text-on-primary-fixed-variant border-primary/20',
  general: 'bg-surface-container text-on-surface-variant border-outline-variant/70',
  closure: 'bg-error-container text-on-error-container border-error/20',
};

export const ANNOUNCEMENT_TYPE_LABELS: Record<Announcement['type'], string> = {
  event: 'Event',
  general: 'General',
  closure: 'School Closure',
};

export function batchReference(announcement: Pick<Announcement, 'target_all_batches' | 'batches'>): string {
  if (announcement.target_all_batches) {
    return 'All Batches';
  }

  if (!announcement.batches?.length) {
    return '—';
  }

  return `Batch ${announcement.batches.join(', ')}`;
}
