import { CountdownTimer } from '../shared/CountdownTimer';
import { ANNOUNCEMENT_ICONS, ANNOUNCEMENT_ICON_TONE, batchReference } from './announcementDisplay';
import { TONE_CLASSES } from '../../lib/toneClasses';
import type { Announcement } from '../../types/Announcement';

interface AnnouncementCardProps {
  announcement: Announcement;
}

export function AnnouncementCard({ announcement }: AnnouncementCardProps) {
  const Icon = ANNOUNCEMENT_ICONS[announcement.type];
  const isExpired = announcement.status === 'expired';

  return (
    <div className={`flex items-start gap-4 rounded-lg border border-outline-variant/70 bg-white p-4 shadow-card ${isExpired ? 'opacity-70' : ''}`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONE_CLASSES[ANNOUNCEMENT_ICON_TONE[announcement.type]]}`}>
        <Icon size={18} aria-hidden="true" strokeWidth={2.25} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-title-md font-title-md text-on-surface">{announcement.title}</p>
        <p className="mt-1 whitespace-pre-wrap text-body-md text-on-surface-variant">{announcement.message}</p>

        {announcement.type === 'event' && announcement.target_date && (
          <div className="mt-2">
            <CountdownTimer targetDate={announcement.target_date} />
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-label-sm text-on-surface-variant">
          <span>{batchReference(announcement)}</span>
          {announcement.published_at && (
            <span>Published {new Date(announcement.published_at).toLocaleDateString()}</span>
          )}
        </div>
      </div>
    </div>
  );
}
