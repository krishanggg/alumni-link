import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, RotateCcw, X } from 'lucide-react';
import { motion } from 'framer-motion';

import type { FeedbackThreadRecord } from '../../types/Feedback';

import { ActionMenu } from '../../components/shared/ActionMenu';
import { Avatar } from '../../components/shared/Avatar';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { Spinner } from '../../components/shared/Spinner';
import { FeedbackReplyComposer } from './FeedbackReplyComposer';
import { useAppReducedMotion } from '../../hooks/useAppReducedMotion';
import { DURATION_FAST, EASING_DECELERATE } from '../../lib/motion';

interface FeedbackThreadDetailPaneProps {
  thread: FeedbackThreadRecord | undefined;
  isLoading: boolean;
  error: string | null;
  isChangingStatus: boolean;
  isReplying: boolean;
  onRetry: () => void;
  onResolve: () => Promise<boolean>;
  onReopen: () => Promise<boolean>;
  onReply: (body: string) => Promise<boolean>;
  onClose: () => void;
  showSchool: boolean;
  viewerId?: number | null;
}

function formatMessageDate(value: string | null): string {
  return value ? new Date(value).toLocaleString() : 'Unknown time';
}

function formatMessageCalendarDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString() : 'Unknown date';
}

function formatMessageTime(value: string | null): string {
  return value ? new Date(value).toLocaleTimeString() : 'Unknown time';
}

export function FeedbackThreadDetailPane({ thread, isLoading, error, isChangingStatus, isReplying, onRetry, onResolve, onReopen, onReply, onClose, showSchool, viewerId = null }: FeedbackThreadDetailPaneProps) {
  const [confirmation, setConfirmation] = useState<'resolve' | 'reopen' | null>(null);
  const messageViewportRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useAppReducedMotion();
  const latestMessageId = thread?.messages?.[thread.messages.length - 1]?.id ?? null;

  useEffect(() => {
    const viewport = messageViewportRef.current;
    if (!viewport) {
      return;
    }

    viewport.scrollTo?.({
      top: viewport.scrollHeight,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  }, [thread?.id, latestMessageId, prefersReducedMotion]);

  if (isLoading) {
    return <div className="flex flex-1 items-center justify-center bg-surface-container-low"><Spinner className="h-7 w-7 text-accent" /></div>;
  }

  if (error || !thread) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-surface-container-low p-8 text-center" role="alert">
        <p className="text-body-md text-on-surface-variant">{error ?? 'This conversation could not be found.'}</p>
        <button type="button" onClick={onRetry} className="text-label-md text-accent hover:text-accent-hover">Try again</button>
      </div>
    );
  }

  const isResolved = thread.status === 'resolved';
  const actionLabel = isResolved ? 'Reopen' : 'Resolve';
  const actionIcon = isResolved ? RotateCcw : CheckCircle2;
  const participantName = showSchool ? thread.school_admin?.name ?? thread.created_by ?? 'Unknown admin' : 'Super Admin';
  const participantLabel = showSchool ? `${thread.school?.name ?? 'Unknown school'} · ${participantName}` : participantName;
  const messages = thread.messages ?? [];

  async function confirmStatusChange() {
    let succeeded = false;
    if (confirmation === 'resolve') {
      succeeded = await onResolve();
    } else if (confirmation === 'reopen') {
      succeeded = await onReopen();
    }
    if (succeeded) {
      setConfirmation(null);
    }
  }

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-surface-container-low" aria-label="Feedback conversation detail">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-outline-variant/70 bg-white px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={participantName} ariaLabel={`${participantName} avatar`} sizeClassName="h-10 w-10" toneClassName="bg-primary-fixed text-primary" />
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-y-1">
            <h2 className="min-w-0 flex-1 truncate text-headline-sm font-headline-sm text-on-surface">{thread.subject}</h2>
            <div className="flex min-w-0 max-w-full items-center">
              <span aria-hidden="true" className="mx-3 h-5 w-px shrink-0 bg-outline-variant" />
              <span className="min-w-0 truncate text-body-sm text-on-surface-variant">{participantLabel}</span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <ActionMenu
            label="Conversation actions"
            items={[{ label: actionLabel, title: `${actionLabel} conversation`, icon: actionIcon, onClick: () => setConfirmation(isResolved ? 'reopen' : 'resolve') }]}
          />
          <button type="button" onClick={onClose} aria-label="Close conversation" className="tap-target rounded-DEFAULT p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div ref={messageViewportRef} className="min-h-0 flex-1 space-y-1 overflow-y-auto bg-surface-container-low p-4 sm:p-6">
        {messages.map((message, index) => {
          const isSent = viewerId !== null && viewerId !== undefined && message.sender?.id === viewerId;
          const previousMessage = messages[index - 1];
          const isGrouped = previousMessage?.sender?.id !== undefined && previousMessage.sender?.id === message.sender?.id;
          const senderLabel = isSent ? 'You' : message.sender?.name ?? 'Unknown sender';
          const isLatestOutgoing = isSent && message.id === latestMessageId;

          return (
            <div key={message.id} className={`flex flex-col ${isSent ? 'items-end' : 'items-start'} ${isGrouped ? 'mt-1' : index === 0 ? '' : 'mt-4'}`}>
              <motion.article
                initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: DURATION_FAST, ease: EASING_DECELERATE }}
                aria-label={`${senderLabel} message`}
                className={`w-full max-w-[85%] rounded-2xl p-4 sm:max-w-[75%] ${isSent ? 'rounded-br-sm bg-primary text-on-primary' : 'rounded-bl-sm border border-outline-variant/70 bg-white text-on-surface'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className={`text-label-md ${isSent ? 'text-on-primary' : 'text-on-surface'}`}>{senderLabel}</p>
                  <time dateTime={message.created_at ?? undefined} className={`text-label-sm ${isSent ? 'text-on-primary/75' : 'text-on-surface-variant'}`}>
                    {isLatestOutgoing ? formatMessageCalendarDate(message.created_at) : formatMessageDate(message.created_at)}
                  </time>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-body-md">{message.body}</p>
              </motion.article>
              {isLatestOutgoing && (
                <p role="status" aria-label={`Sent ${formatMessageTime(message.created_at)}`} className="mt-1 flex flex-wrap items-center justify-end gap-x-2 gap-y-0.5 self-end text-right text-label-sm text-on-surface-variant">
                  <span>Sent</span>
                  <time dateTime={message.created_at ?? undefined}>{formatMessageTime(message.created_at)}</time>
                </p>
              )}
            </div>
          );
        })}
      </div>

      <FeedbackReplyComposer onSubmit={onReply} isSubmitting={isReplying} />
      <ConfirmDialog
        isOpen={confirmation !== null}
        title={isResolved ? 'Reopen conversation?' : 'Resolve conversation?'}
        message={isResolved ? 'Reopening makes this conversation active again.' : 'The conversation will move to Resolved. A later reply will reopen it automatically.'}
        confirmLabel={isResolved ? 'Reopen' : 'Resolve'}
        onConfirm={() => void confirmStatusChange()}
        onCancel={() => setConfirmation(null)}
        isLoading={isChangingStatus}
      />
    </section>
  );
}
