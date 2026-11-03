import { MessageSquare } from 'lucide-react';

export function FeedbackEmptyState() {
  return (
    <div className="flex h-full min-h-80 flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-fixed text-primary">
        <MessageSquare size={26} aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-headline-sm font-headline-sm text-on-surface">Select a conversation</h2>
      <p className="mt-2 max-w-sm text-body-md text-on-surface-variant">Choose a feedback thread to read the conversation and send a reply.</p>
    </div>
  );
}
