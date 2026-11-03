import { useEffect, useRef, useState } from 'react';

import { Button } from '../../components/shared/Button';
import { TextAreaField } from '../../components/shared/TextAreaField';

interface FeedbackReplyComposerProps {
  onSubmit: (body: string) => Promise<boolean>;
  isSubmitting: boolean;
}

export function FeedbackReplyComposer({ onSubmit, isSubmitting }: FeedbackReplyComposerProps) {
  const [body, setBody] = useState('');
  const [focusRequest, setFocusRequest] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const restoreFocusAfterKeyboardSubmitRef = useRef(false);

  useEffect(() => {
    if (focusRequest === 0 || isSubmitting) {
      return;
    }

    textareaRef.current?.focus();
  }, [focusRequest, isSubmitting]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const restoreFocusAfterSubmit = restoreFocusAfterKeyboardSubmitRef.current;
    restoreFocusAfterKeyboardSubmitRef.current = false;
    const trimmedBody = body.trim();
    if (!trimmedBody) {
      return;
    }

    const submitted = await onSubmit(trimmedBody);
    if (submitted) {
      setBody('');
      if (restoreFocusAfterSubmit) {
        setFocusRequest((request) => request + 1);
      }
    }
  }

  function handleBodyKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || isSubmitting || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    restoreFocusAfterKeyboardSubmitRef.current = true;
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="shrink-0 border-t border-outline-variant/70 bg-white p-4 sm:p-5">
      <TextAreaField label="Reply" value={body} onChange={(event) => setBody(event.target.value)} onFocus={(event) => { textareaRef.current = event.currentTarget; }} onKeyDown={handleBodyKeyDown} placeholder="Write a reply…" rows={3} disabled={isSubmitting} />
      <div className="mt-3 flex justify-end">
        <Button type="submit" size="sm" disabled={!body.trim()} isLoading={isSubmitting} loadingText="Sending">Send reply</Button>
      </div>
    </form>
  );
}
