import { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';

import { Button } from '../../components/shared/Button';
import { Modal } from '../../components/shared/Modal';
import { SelectField } from '../../components/shared/SelectField';
import { Spinner } from '../../components/shared/Spinner';
import { TextAreaField } from '../../components/shared/TextAreaField';
import { TextField } from '../../components/shared/TextField';
import type { FeedbackRecipientRecord } from '../../types/Feedback';

interface FeedbackNewThreadDialogProps {
  isOpen: boolean;
  isSubmitting: boolean;
  isSuperAdmin: boolean;
  recipients: FeedbackRecipientRecord[];
  isRecipientsLoading: boolean;
  recipientsError: string | null;
  onClose: () => void;
  onSubmit: (subject: string, body: string, schoolAdminId?: number) => Promise<boolean>;
}

export function FeedbackNewThreadDialog({ isOpen, isSubmitting, isSuperAdmin, recipients, isRecipientsLoading, recipientsError, onClose, onSubmit }: FeedbackNewThreadDialogProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [schoolAdminId, setSchoolAdminId] = useState('');
  const [subjectError, setSubjectError] = useState('');
  const [bodyError, setBodyError] = useState('');
  const [recipientError, setRecipientError] = useState('');

  function reset() {
    setSubject('');
    setBody('');
    setSchoolAdminId('');
    setSubjectError('');
    setBodyError('');
    setRecipientError('');
  }

  function close() {
    if (!isSubmitting) {
      reset();
      onClose();
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextSubjectError = subject.trim() ? '' : 'Enter a subject.';
    const nextBodyError = body.trim() ? '' : 'Enter a message.';
    setSubjectError(nextSubjectError);
    setBodyError(nextBodyError);

    if (nextSubjectError || nextBodyError) {
      return;
    }
    if (isSuperAdmin && !schoolAdminId) {
      setRecipientError('Choose a School Admin recipient.');
      return;
    }
    const submitted = await onSubmit(subject.trim(), body.trim(), schoolAdminId ? Number(schoolAdminId) : undefined);
    if (submitted) {
      reset();
    }
  }

  function handleBodyKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || isSubmitting || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <Modal isOpen={isOpen} onClose={close} title="Start a feedback conversation" icon={MessageSquarePlus} footer={<><Button variant="secondary" onClick={close} disabled={isSubmitting}>Cancel</Button><Button type="submit" form="new-feedback-thread" isLoading={isSubmitting} loadingText="Sending" disabled={isSuperAdmin && (isRecipientsLoading || recipients.length === 0)}>Send feedback</Button></>}>
      <form id="new-feedback-thread" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {isSuperAdmin && (
          <div>
            {isRecipientsLoading ? (
              <div className="flex items-center gap-2 text-body-sm text-on-surface-variant" role="status"><Spinner className="h-4 w-4" /> Loading School Admins…</div>
            ) : recipientsError ? (
              <p className="text-body-sm text-error" role="alert">Unable to load School Admin recipients: {recipientsError}</p>
            ) : recipients.length === 0 ? (
              <p className="text-body-sm text-error" role="alert">No active School Admin recipients are available.</p>
            ) : (
              <SelectField label="School Admin recipient" value={schoolAdminId} error={recipientError || undefined} onChange={(event) => { setSchoolAdminId(String(event.target.value)); setRecipientError(''); }}>
                <option value="">Choose a School Admin</option>
                {recipients.map((recipient) => <option key={recipient.id} value={recipient.id}>{recipient.name} · {recipient.school.name}</option>)}
              </SelectField>
            )}
          </div>
        )}
        <TextField label="Subject" value={subject} error={subjectError || undefined} onChange={(event) => { setSubject(event.target.value); if (subjectError) setSubjectError(''); }} maxLength={150} autoFocus />
        <TextAreaField label="Message" value={body} error={bodyError || undefined} onChange={(event) => { setBody(event.target.value); if (bodyError) setBodyError(''); }} onKeyDown={handleBodyKeyDown} maxLength={2000} rows={6} />
      </form>
    </Modal>
  );
}
