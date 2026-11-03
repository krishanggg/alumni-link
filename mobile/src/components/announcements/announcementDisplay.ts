import type { Announcement } from '../../types/announcement';
import type { IconName } from '../shared/Icon';

import { colors, extendedColors } from '../../theme';

const EVENT_BG = colors.primaryFixed;
const EVENT_TEXT = colors.onPrimaryFixedVariant;
const EVENT_BORDER = colors.primaryFixedDim;

const GENERAL_BG = colors.surfaceContainer;
const GENERAL_TEXT = colors.onSurfaceVariant;
const GENERAL_BORDER = colors.outlineVariant;

const CLOSURE_BG = colors.errorContainer;
const CLOSURE_TEXT = colors.onErrorContainer;
const CLOSURE_BORDER = extendedColors.errorContainerBorder;

export const TYPE_STYLES: Record<Announcement['type'], { bg: string; text: string; border: string }> = {
  event: { bg: EVENT_BG, text: EVENT_TEXT, border: EVENT_BORDER },
  general: { bg: GENERAL_BG, text: GENERAL_TEXT, border: GENERAL_BORDER },
  closure: { bg: CLOSURE_BG, text: CLOSURE_TEXT, border: CLOSURE_BORDER },
};

export const TYPE_ICONS: Record<Announcement['type'], IconName> = {
  event: 'event',
  general: 'general',
  closure: 'closure',
};

/**
 * Human-readable names for the three stored `type` values. The dashboard card
 * names the type explicitly because, unlike the Announcements tab, it shows one
 * announcement out of context and the icon alone has to carry too much.
 */
export const TYPE_LABELS: Record<Announcement['type'], string> = {
  event: 'Event',
  general: 'News & Updates',
  closure: 'School Closure',
};

export function batchReference(announcement: Announcement): string {
  if (announcement.target_all_batches) {
    return 'All Batches';
  }
  if (!announcement.batches || announcement.batches.length === 0) {
    return '\u2014';
  }
  return `Batch ${announcement.batches.join(', ')}`;
}
