import { useEffect, useId, useState } from 'react';

import { useBatchNote } from '../../hooks/useBatches';

interface BatchNotesEditorProps {
  year: number;
  schoolId?: number;
}

export function BatchNotesEditor({ year, schoolId }: BatchNotesEditorProps) {
  const { note: savedNote, isLoading, saveNote, isSaving } = useBatchNote(year, schoolId);
  const [draft, setDraft] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const notesFieldId = useId();
  const notesHeadingId = notesFieldId + '-heading';
  const notesCountId = notesFieldId + '-count';

  const note = draft ?? savedNote ?? '';

  // A different batch scope means a different note; discard the draft so an
  // unsaved edit from the previous scope cannot leak into the new one.
  useEffect(() => {
    setDraft(null);
    setSaveError(null);
  }, [year, schoolId]);

  async function handleSave() {
    setSaveError(null);
    try {
      await saveNote(note);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save note');
    }
  }

  if (isLoading) {
    return <div className="h-24 animate-pulse rounded-lg bg-surface-container" />;
  }

  return (
    <div className="rounded-lg border border-outline-variant/70 bg-white shadow-card p-4">
      <h3 id={notesHeadingId} className="text-headline-sm font-headline-sm text-on-surface">Batch Notes</h3>
      {saveError && (
        <p className="mt-1 text-label-sm text-error" role="alert">{saveError}</p>
      )}
      <textarea
        id={notesFieldId}
        aria-labelledby={notesHeadingId}
        aria-describedby={notesCountId}
        value={note}
        onChange={(e) => setDraft(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Add notes about this batch"
        className="mt-2 block w-full rounded-DEFAULT border border-outline-variant px-3 py-2 text-body-md focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
      />
      <div className="mt-2 flex items-center justify-between">
        <span id={notesCountId} className="text-label-sm text-on-surface-variant">{note.length}/2000</span>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-DEFAULT bg-secondary px-4 py-1.5 text-label-sm font-label-sm text-on-secondary hover:opacity-90 disabled:opacity-50"
        >
          {isSaving ? 'Saving' : 'Save Note'}
        </button>
      </div>
    </div>
  );
}
