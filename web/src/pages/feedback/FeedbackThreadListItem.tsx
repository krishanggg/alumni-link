import { Circle } from 'lucide-react';

import type { FeedbackThreadRecord } from '../../types/Feedback';

import { StatusBadge } from '../../components/shared/StatusBadge';

interface FeedbackThreadListItemProps {
  thread: FeedbackThreadRecord;
  isSelected: boolean;
  showSchool: boolean;
  onSelect: (id: number) => void;
}

function formatDate(value: string | null): string {
  if (!value) {
    return 'No messages';
  }

  const elapsedSeconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (elapsedSeconds < 60) {
    return 'Just now';
  }
  if (elapsedSeconds < 3600) {
    const minutes = Math.round(elapsedSeconds / 60);
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  if (elapsedSeconds < 86400) {
    const hours = Math.round(elapsedSeconds / 3600);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  if (elapsedSeconds < 604800) {
    const days = Math.round(elapsedSeconds / 86400);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

export function FeedbackThreadListItem({ thread, isSelected, showSchool, onSelect }: FeedbackThreadListItemProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(thread.id)}
      aria-current={isSelected ? 'true' : undefined}
      className={`block w-full border-b border-outline-variant/60 px-4 py-3 text-left transition-colors ${isSelected ? 'bg-primary-fixed/60' : 'hover:bg-surface-container-low'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {thread.unread && <Circle className="h-2.5 w-2.5 shrink-0 fill-accent text-accent" aria-label="Unread" />}
          <span className={`truncate text-body-md ${thread.unread ? 'font-label-md text-on-surface' : 'text-on-surface'}`}>{thread.subject}</span>
        </div>
        <span className="shrink-0 text-label-sm text-on-surface-variant">{formatDate(thread.last_message_at)}</span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="min-w-0 truncate text-body-sm text-on-surface-variant">
          {showSchool
            ? `${thread.school?.name ?? 'Unknown school'} · ${thread.school_admin?.name ?? thread.created_by ?? 'Unknown admin'}`
            : 'Super Admin'}
        </div>
        <StatusBadge status={thread.status} />
      </div>
    </button>
  );
}
