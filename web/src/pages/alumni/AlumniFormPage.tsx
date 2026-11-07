import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../services/api';
import { AlumniService } from '../../services/AlumniService';
import { AlumniForm } from '../../components/alumni/AlumniForm';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { useAuth } from '../../hooks/useAuth';
import { useScope } from '../../hooks/useScope';
import { useAlumniMutations } from '../../hooks/useAlumni';
import type { AlumniFormInput, AlumniRecord } from '../../hooks/useAlumni';

function AlumniFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { createAlumni, updateAlumni, uploadAlumniPhoto, deleteAlumniPhoto } = useAlumniMutations();
  const { schoolId: selectedSchoolId } = useScope();
  const isEditing = Boolean(id);

  const [record, setRecord] = useState<AlumniRecord | null>(null);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formFieldErrors, setFormFieldErrors] = useState<Record<string, string[]>>({});
  const [photoRemovalRequest, setPhotoRemovalRequest] = useState<{ data: AlumniFormInput; photoFile: File | null; removePhoto: boolean } | null>(null);
  const [photoRemovalError, setPhotoRemovalError] = useState('');

  useEffect(() => {
    if (!id) {
      return;
    }

    AlumniService.getAlumni(Number(id))
      .then(setRecord)
      .catch((err) => setFormError(err instanceof Error ? err.message : 'Failed to load alumni record'))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function saveAlumni(data: AlumniFormInput, photoFile: File | null, removePhoto: boolean): Promise<boolean> {
    setIsSubmitting(true);
    setFormError('');
    setFormFieldErrors({});

    try {
      let saved: AlumniRecord;

      if (isEditing && id) {
        saved = await updateAlumni(Number(id), data);
      } else {
        saved = await createAlumni(data);
      }

      if (photoFile) {
        await uploadAlumniPhoto(saved.id, photoFile);
      } else if (removePhoto) {
        await deleteAlumniPhoto(saved.id);
      }

      showToast(isEditing ? 'Alumni record updated successfully.' : 'Alumni record created successfully.');
      navigate('/alumni');
      return true;
    } catch (err) {
      let message: string;
      if (err instanceof ApiError && err.status === 422) {
        const errors = (err.data as { errors?: Record<string, string[]> })?.errors;
        setFormFieldErrors(errors || {});
        setFormError('Please correct the errors below.');
        message = 'Please correct the errors below.';
      } else {
        message = err instanceof Error ? err.message : 'An error occurred';
        setFormError(message);
      }
      if (removePhoto) {
        setPhotoRemovalError(message);
        showToast(message, 'error');
      }
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSave(data: AlumniFormInput, photoFile: File | null, removePhoto: boolean) {
    if (removePhoto && !photoFile && record?.profile_photo_url) {
      setPhotoRemovalRequest({ data, photoFile, removePhoto });
      setPhotoRemovalError('');
      return;
    }

    await saveAlumni(data, photoFile, removePhoto);
  }

  async function confirmPhotoRemoval() {
    if (!photoRemovalRequest) {
      return;
    }

    const didSave = await saveAlumni(
      photoRemovalRequest.data,
      photoRemovalRequest.photoFile,
      photoRemovalRequest.removePhoto,
    );

    if (didSave) {
      setPhotoRemovalRequest(null);
    }
  }

  if (isLoading) {
    return (
      <div className="p-6" aria-busy="true">
        <div className="h-8 w-64 animate-pulse rounded bg-surface-container" />
        <div className="mt-6 h-96 animate-pulse rounded-lg bg-surface-container" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-6">
      <nav className="flex shrink-0 items-center gap-1 text-body-md text-on-surface-variant" aria-label="Breadcrumb">
        <Link to="/alumni" className="hover:text-accent">Alumni</Link>
        <ChevronRight size={14} aria-hidden="true" />
        <span className="text-on-surface">{isEditing ? 'Edit Alumni' : 'Add New Alumni'}</span>
      </nav>

      <div className="mx-auto mt-6 flex w-full min-h-0 max-w-4xl flex-1 flex-col overflow-hidden rounded-lg border border-outline-variant/70 bg-white shadow-card">
        <AlumniForm
          initialData={record}
          onSubmit={handleSave}
          onCancel={() => navigate('/alumni')}
          isSubmitting={isSubmitting}
          error={formError}
          fieldErrors={formFieldErrors}
          lockedSchoolId={user?.role === 'school_admin' ? user.school_id : null}
          initialSchoolId={user?.role === 'super_admin' ? selectedSchoolId ?? null : null}
          requireSchool={!isEditing && user?.role === 'super_admin'}
        />
      </div>

      <ConfirmDialog
        isOpen={photoRemovalRequest !== null}
        title="Remove profile photo?"
        message="Your current profile photo will be permanently removed from this alumni record. Other changes in this save will still be applied."
        confirmLabel="Remove photo and save"
        variant="danger"
        onConfirm={() => { void confirmPhotoRemoval(); }}
        onCancel={() => {
          if (!isSubmitting) {
            setPhotoRemovalRequest(null);
            setPhotoRemovalError('');
          }
        }}
        isLoading={isSubmitting}
        error={photoRemovalError || (photoRemovalRequest ? formError : '')}
        onRetry={() => { void confirmPhotoRemoval(); }}
      />
    </div>
  );
}

export default AlumniFormPage;
