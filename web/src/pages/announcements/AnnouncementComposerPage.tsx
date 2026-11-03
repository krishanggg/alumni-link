import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X } from 'lucide-react';

import { useAnnouncementMutations } from '../../hooks/useAnnouncements';
import { AnnouncementService } from '../../services/AnnouncementService';
import { SchoolService } from '../../services/SchoolService';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { CountdownTimer } from '../../components/shared/CountdownTimer';
import { TargetBatchSelector } from '../../components/announcements/TargetBatchSelector';
import { SelectField } from '../../components/shared/SelectField';
import { TextField } from '../../components/shared/TextField';
import { TextAreaField } from '../../components/shared/TextAreaField';
import { DateTimeField } from '../../components/shared/DateTimeField';
import { Checkbox } from '../../components/shared/Checkbox';
import { Button } from '../../components/shared/Button';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { HighlightedName } from '../../components/shared/HighlightedName';
import {
  ANNOUNCEMENT_ICONS,
  ANNOUNCEMENT_BANNER_CLASSES,
  ANNOUNCEMENT_ICON_TONE,
  ANNOUNCEMENT_TYPE_LABELS,
  batchReference,
} from '../../components/announcements/announcementDisplay';
import { TONE_CLASSES } from '../../lib/toneClasses';

import type { AnnouncementFormInput } from '../../types/Announcement';

function AnnouncementComposerPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const { create, update, publish, unpublish, expire } = useAnnouncementMutations();
  const { showToast } = useToast();

  const isEditing = !!id;

  const [form, setForm] = useState<AnnouncementFormInput>({
    type: 'general',
    title: '',
    message: '',
    target_date: null,
    school_id: null,
    target_all_batches: true,
    target_batches: [],
    show_as_modal: false,
    status: 'draft',
  });
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [existingStatus, setExistingStatus] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<'banner' | 'modal'>('banner');
  const [schools, setSchools] = useState<Array<{ id: number; name: string }>>([]);
  const [lifecycleConfirmation, setLifecycleConfirmation] = useState<'unpublish' | 'expire' | null>(null);
  const [lifecycleError, setLifecycleError] = useState('');
  const [isLifecyclePending, setIsLifecyclePending] = useState(false);

  useEffect(() => {
    if (user?.role === 'school_admin') {
      return;
    }

    async function loadSchools() {
      try {
        const data = await SchoolService.listSchools();
        setSchools(data.data ?? []);
      } catch {
        setSchools([]);
      }
    }

    loadSchools();
  }, [user?.role]);

  useEffect(() => {
    if (!isEditing || !id) {
      return;
    }

    async function load() {
      try {
        const data = await AnnouncementService.getAnnouncement(Number(id));
        setForm({
          type: data.type,
          title: data.title,
          message: data.message,
          target_date: data.target_date,
          school_id: data.school_id,
          target_all_batches: data.target_all_batches,
          target_batches: data.batches || [],
          show_as_modal: data.show_as_modal,
          status: data.status === 'published' ? 'published' : 'draft',
        });
        setExistingStatus(data.status);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load announcement');
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [id, isEditing]);

  function updateField<K extends keyof AnnouncementFormInput>(key: K, value: AnnouncementFormInput[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      ...(key === 'school_id' ? { target_batches: [] } : {}),
    }));
  }

  async function handleSave(publishNow: boolean) {
    setError('');
    setIsSaving(true);

    try {
      const payload = { ...form };

      if (isEditing && id) {
        const numId = parseInt(id, 10);
        await update(numId, payload);

        if (publishNow && existingStatus !== 'published') {
          await publish(numId);
        }

        showToast('Announcement updated successfully.');
        navigate('/announcements');
      } else {
        await create({ ...payload, status: publishNow ? 'published' : 'draft' });
        showToast(publishNow ? 'Announcement published successfully.' : 'Announcement saved as draft.');
        navigate('/announcements');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }

  function lifecycleMessage(action: 'publish' | 'unpublish' | 'expire'): string {
    if (action === 'publish') {
      return 'Announcement published successfully.';
    }

    if (action === 'unpublish') {
      return 'Announcement unpublished.';
    }

    return 'Announcement expired.';
  }

  async function executeLifecycle(action: 'publish' | 'unpublish' | 'expire'): Promise<boolean> {
    if (!id) {
      return false;
    }

    setError('');
    setLifecycleError('');
    setIsLifecyclePending(true);

    try {
      const numId = parseInt(id, 10);

      if (action === 'publish') {
        await publish(numId);
      } else if (action === 'unpublish') {
        await unpublish(numId);
      } else {
        await expire(numId);
      }

      showToast(lifecycleMessage(action));
      navigate('/announcements');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Action failed';
      setLifecycleError(message);
      showToast(message, 'error');
      return false;
    } finally {
      setIsLifecyclePending(false);
    }
  }

  async function confirmLifecycle() {
    if (!lifecycleConfirmation) {
      return;
    }

    const action = lifecycleConfirmation;
    if (await executeLifecycle(action)) {
      setLifecycleConfirmation(null);
    }
  }

  function handleLifecycle(action: 'publish' | 'unpublish' | 'expire') {
    if (action === 'publish') {
      void executeLifecycle(action);
      return;
    }

    setLifecycleConfirmation(action);
    setLifecycleError('');
  }

  if (isLoading) {
    return <div className="p-6"><div className="animate-pulse h-64 rounded-lg bg-surface-container" /></div>;
  }

  const PreviewIcon = ANNOUNCEMENT_ICONS[form.type];
  const previewTitle = form.title || 'Title';
  const previewMessage = form.message || 'Message preview';

  return (
    <div className="p-6">
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-4 rounded-lg border border-outline-variant/70 bg-white shadow-card p-6">
          <SelectField
            label="Type"
            value={form.type}
            onChange={(e) => updateField('type', e.target.value as AnnouncementFormInput['type'])}
          >
            <option value="general">General</option>
            <option value="event">Event</option>
            <option value="closure">School Closure</option>
          </SelectField>

          <TextField
            label="Title"
            value={form.title}
            onChange={(e) => updateField('title', e.target.value)}
            maxLength={100}
            hint={`${form.title.length}/100`}
          />

          <TextAreaField
            label="Message"
            value={form.message}
            onChange={(e) => updateField('message', e.target.value)}
            rows={4}
            maxLength={1000}
            hint={`${form.message.length}/1000`}
          />

          {form.type === 'event' && (
            <DateTimeField
              label="Target Date & Time"
              value={form.target_date}
              onChange={(value) => updateField('target_date', value)}
            />
          )}

          {user?.role !== 'school_admin' && (
            <SelectField
              label="Target School"
              value={form.school_id ?? ''}
              onChange={(e) => updateField('school_id', e.target.value ? parseInt(e.target.value, 10) : null)}
            >
              <option value="">All Schools</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>{school.name}</option>
              ))}
            </SelectField>
          )}

          <div>
            <label className="block text-label-md font-label-md text-on-surface mb-2">Target Batches</label>
            <TargetBatchSelector
              targetAllBatches={form.target_all_batches}
              selectedBatches={form.target_batches}
              onChangeAll={(all) => updateField('target_all_batches', all)}
              onChangeBatches={(batches) => updateField('target_batches', batches)}
              schoolId={user?.role === 'super_admin' ? (form.school_id ?? undefined) : undefined}
            />
          </div>

          <Checkbox
            label="Show as Modal on Open"
            checked={form.show_as_modal}
            onChange={(e) => updateField('show_as_modal', e.target.checked)}
          />

          {error && <div className="rounded-DEFAULT bg-error-container p-3 text-body-md text-on-error-container" role="alert">{error}</div>}

          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-3">
              {(!isEditing || existingStatus !== 'published') && (
                <Button onClick={() => handleSave(true)} disabled={!form.title.trim()} isLoading={isSaving} loadingText="Publishing">
                  Publish
                </Button>
              )}
              <Button variant="secondary" onClick={() => navigate('/announcements')}>
                Cancel
              </Button>
            </div>
            {(!isEditing || existingStatus !== 'published') && (
              <Button variant="secondary" onClick={() => handleSave(false)} disabled={!form.title.trim()} isLoading={isSaving} loadingText="Saving">
                Save Draft
              </Button>
            )}
          </div>

          {isEditing && existingStatus === 'published' && (
            <div className="mt-4 border-t border-outline-variant pt-4">
              <p className="text-label-md font-label-md text-on-surface mb-2">Manage</p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => handleLifecycle('unpublish')} disabled={isLifecyclePending || lifecycleConfirmation !== null}>
                  Unpublish
                </Button>
                <Button size="sm" onClick={() => handleLifecycle('publish')} disabled={isSaving || isLifecyclePending}>
                  Republish
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleLifecycle('expire')} disabled={isLifecyclePending || lifecycleConfirmation !== null}>
                  Expire
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-outline-variant/70 bg-white shadow-card p-6">
          <div
            role="tablist"
            aria-label="Preview style"
            className="mb-3 flex gap-2"
            onKeyDown={(e) => {
              if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
                return;
              }
              e.preventDefault();
              const next = previewTab === 'banner' ? 'modal' : 'banner';
              setPreviewTab(next);
              document.getElementById(`preview-tab-${next}`)?.focus();
            }}
          >
            <button
              type="button"
              id="preview-tab-banner"
              role="tab"
              aria-selected={previewTab === 'banner'}
              aria-controls="preview-panel-banner"
              tabIndex={previewTab === 'banner' ? 0 : -1}
              onClick={() => setPreviewTab('banner')}
              className={`rounded-DEFAULT px-3 py-1 text-label-sm font-label-sm ${previewTab === 'banner' ? 'bg-accent text-on-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
            >
              Banner
            </button>
            <button
              type="button"
              id="preview-tab-modal"
              role="tab"
              aria-selected={previewTab === 'modal'}
              aria-controls="preview-panel-modal"
              tabIndex={previewTab === 'modal' ? 0 : -1}
              onClick={() => setPreviewTab('modal')}
              className={`rounded-DEFAULT px-3 py-1 text-label-sm font-label-sm ${previewTab === 'modal' ? 'bg-accent text-on-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
            >
              Modal
            </button>
          </div>

          {previewTab === 'banner' && (
            <div id="preview-panel-banner" role="tabpanel" aria-labelledby="preview-tab-banner" className="overflow-hidden rounded-lg border border-outline-variant/70">
              <div className="flex shrink-0 items-center gap-4 border-b border-outline-variant bg-white px-6 py-4">
                <div className="h-2 w-24 rounded-full bg-surface-container-high" />
              </div>
              <div className="space-y-2 bg-background px-6 pt-4 pb-3">
                <div className={`flex items-start gap-3 rounded-lg border p-3 shadow-card ${ANNOUNCEMENT_BANNER_CLASSES[form.type]}`}>
                  <PreviewIcon size={20} className="mt-0.5 shrink-0" aria-hidden="true" strokeWidth={2.25} />
                  <div className="min-w-0 flex-1">
                    <p className="font-label-md text-body-md">{previewTitle}</p>
                    <p className="line-clamp-2 text-body-md">{previewMessage}</p>
                    {form.type === 'event' && form.target_date && (
                      <div className="mt-1"><CountdownTimer targetDate={form.target_date} /></div>
                    )}
                  </div>
                  <button type="button" tabIndex={-1} className="shrink-0 rounded-DEFAULT p-1 transition-colors hover:bg-black/10" aria-label="Dismiss announcement">
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {previewTab === 'modal' && (
            <div id="preview-panel-modal" role="tabpanel" aria-labelledby="preview-tab-modal" className="rounded-lg bg-primary/30 p-6 backdrop-blur-sm">
              <div className="mx-auto flex w-full max-w-xs flex-col rounded-2xl bg-white shadow-panel">
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-outline-variant/60 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TONE_CLASSES[ANNOUNCEMENT_ICON_TONE[form.type]]}`}>
                      <PreviewIcon size={18} aria-hidden="true" strokeWidth={2.25} />
                    </div>
                    <h3 className="truncate text-headline-sm font-headline-sm text-on-surface">{previewTitle}</h3>
                  </div>
                  <X size={18} className="shrink-0 text-on-surface-variant" aria-hidden="true" />
                </div>

                <div className="px-4 py-4">
                  <p className="text-overline font-overline uppercase text-on-surface-variant">
                    {ANNOUNCEMENT_TYPE_LABELS[form.type]}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-body-md text-on-surface">{previewMessage}</p>
                  {form.type === 'event' && form.target_date && (
                    <div className="mt-4"><CountdownTimer targetDate={form.target_date} /></div>
                  )}
                  <p className="mt-4 text-label-sm text-on-surface-variant">
                    {batchReference({ target_all_batches: form.target_all_batches, batches: form.target_batches })}
                  </p>
                </div>

                <div className="flex shrink-0 justify-end gap-3 border-t border-outline-variant/60 px-4 py-3">
                  <Button tabIndex={-1}>
                    Got it
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={lifecycleConfirmation !== null}
        title={<>{lifecycleConfirmation === 'unpublish' ? 'Unpublish' : 'Expire'} <HighlightedName>{form.title || 'announcement'}</HighlightedName>?</>}
        message={lifecycleConfirmation === 'unpublish'
          ? <><HighlightedName>{form.title || 'This announcement'}</HighlightedName> will return to Draft and stop appearing in alumni announcement feeds until it is published again.</>
          : <><HighlightedName>{form.title || 'This announcement'}</HighlightedName> will be marked Expired and stop appearing as an active announcement.</>}
        confirmLabel={lifecycleConfirmation === 'unpublish' ? 'Unpublish announcement' : 'Expire announcement'}
        variant="danger"
        onConfirm={() => { void confirmLifecycle(); }}
        onCancel={() => {
          if (!isLifecyclePending) {
            setLifecycleConfirmation(null);
            setLifecycleError('');
          }
        }}
        isLoading={isLifecyclePending}
        error={lifecycleError}
        onRetry={() => { void confirmLifecycle(); }}
      />
    </div>
  );
}

export default AnnouncementComposerPage;
