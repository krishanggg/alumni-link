import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, CircleHelp, Save } from 'lucide-react';

import type { ProfileResponse } from '../../types/Profile';

import { SettingsLayout } from '../../components/settings/SettingsLayout';
import { ProfilePhotoUpload } from '../../components/alumni/ProfilePhotoUpload';
import { PrivacyHelp } from '../../components/shared/PrivacyHelp';
import { Tooltip } from '../../components/shared/Tooltip';
import { FormErrorSummary } from '../../components/shared/FormErrorSummary';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { TextField } from '../../components/shared/TextField';
import { SelectField } from '../../components/shared/SelectField';
import { DateField } from '../../components/shared/DateField';
import { Button } from '../../components/shared/Button';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';

import { ProfileService } from '../../services/ProfileService';
import { ApiError } from '../../services/api';

import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { EMPLOYMENT_STATUS_OPTIONS } from '../../types/Alumni';
import { isAdminRole } from '../../types/Auth';
import { validatePhilippinePhoneNumber } from '../../utils/validation';

interface PendingProfileSave {
  photoAction: 'upload' | 'remove' | null;
  photoFile: File | null;
  profilePayload: Record<string, unknown>;
  needsUserRefresh: boolean;
}

function mergeProfileResponse(current: ProfileResponse, updated: ProfileResponse): ProfileResponse {
  return {
    ...current,
    ...updated,
    alumni: current.alumni && updated.alumni
      ? { ...current.alumni, ...updated.alumni }
      : updated.alumni ?? current.alumni,
  };
}

function mergePhotoResponse(current: ProfileResponse, updated: ProfileResponse): ProfileResponse {
  return {
    ...current,
    photo_url: updated.photo_url,
    alumni: current.alumni && updated.alumni
      ? { ...current.alumni, profile_photo_url: updated.alumni.profile_photo_url }
      : updated.alumni ?? current.alumni,
  };
}

export default function ProfileSettings() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [success, setSuccess] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoMarkedForRemoval, setPhotoMarkedForRemoval] = useState(false);
  const [initialProfile, setInitialProfile] = useState<ProfileResponse | null>(null);
  const [photoRemovalConfirmationOpen, setPhotoRemovalConfirmationOpen] = useState(false);
  const [photoRemovalError, setPhotoRemovalError] = useState('');
  const pendingSaveRef = useRef<PendingProfileSave | null>(null);
  const isAdmin = user ? isAdminRole(user.role) : false;

  const canEditAlumniFields = !isAdmin && !!user?.alumni_id;

  useEffect(() => {
    async function load() {
      try {
        const data = await ProfileService.getProfileForCurrentUser();
        setProfile(data);
        setInitialProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, []);

  function buildProfilePayload(currentProfile: ProfileResponse, baseline: ProfileResponse | null): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    if (currentProfile.email !== baseline?.email) {
      payload.email = currentProfile.email;
    }
    if (currentProfile.username !== baseline?.username) {
      payload.username = currentProfile.username;
    }

    if (canEditAlumniFields && currentProfile.alumni && baseline?.alumni) {
      if (currentProfile.alumni.contact_number !== baseline.alumni.contact_number) {
        payload.contact_number = currentProfile.alumni.contact_number || null;
      }
      if (currentProfile.alumni.address !== baseline.alumni.address) {
        payload.address = currentProfile.alumni.address || null;
      }
      if (currentProfile.alumni.privacy !== baseline.alumni.privacy) {
        payload.privacy = currentProfile.alumni.privacy;
      }
      if (currentProfile.alumni.gender !== baseline.alumni.gender) {
        payload.gender = currentProfile.alumni.gender || null;
      }
      if (currentProfile.alumni.contact_email !== baseline.alumni.contact_email) {
        payload.contact_email = currentProfile.alumni.contact_email || null;
      }
      if (currentProfile.alumni.birthdate !== baseline.alumni.birthdate) {
        payload.birthdate = currentProfile.alumni.birthdate || null;
      }

      const employmentStatus = currentProfile.alumni.employment_status ?? null;
      const companyName = currentProfile.alumni.company_name ?? null;
      const positionInCompany = currentProfile.alumni.position_in_company ?? null;
      const initialEmploymentStatus = baseline.alumni.employment_status ?? null;
      const initialCompanyName = baseline.alumni.company_name ?? null;
      const initialPositionInCompany = baseline.alumni.position_in_company ?? null;

      if (
        employmentStatus !== initialEmploymentStatus ||
        companyName !== initialCompanyName ||
        positionInCompany !== initialPositionInCompany
      ) {
        payload.employment_status = employmentStatus;
        payload.company_name = companyName;
        payload.position_in_company = positionInCompany;
      }
    }

    return payload;
  }

  function createPendingSave(): PendingProfileSave | null {
    if (!profile) {
      return null;
    }

    return {
      photoAction: photoFile ? 'upload' : photoMarkedForRemoval ? 'remove' : null,
      photoFile,
      profilePayload: buildProfilePayload(profile, initialProfile),
      needsUserRefresh: false,
    };
  }

  async function saveProfile(snapshot: PendingProfileSave): Promise<boolean> {
    if (!profile) {
      return false;
    }

    pendingSaveRef.current = snapshot;
    setIsSaving(true);
    setError('');
    setFieldErrors({});
    setSuccess('');
    if (snapshot.photoAction === 'remove' || photoMarkedForRemoval) {
      setPhotoRemovalError('');
    }

    let workingProfile = profile;

    try {
      if (snapshot.photoAction === 'upload' && snapshot.photoFile) {
        const updated = await ProfileService.uploadProfilePhotoForCurrentUser(snapshot.photoFile);
        workingProfile = mergePhotoResponse(workingProfile, updated);
        setProfile(workingProfile);
        snapshot.photoAction = null;
        snapshot.needsUserRefresh = true;
      } else if (snapshot.photoAction === 'remove') {
        const updated = await ProfileService.deleteProfilePhotoForCurrentUser();
        workingProfile = mergePhotoResponse(workingProfile, updated);
        setProfile(workingProfile);
        snapshot.photoAction = null;
        snapshot.needsUserRefresh = true;
      }

      if (Object.keys(snapshot.profilePayload).length > 0) {
        const updated = await ProfileService.updateProfileForCurrentUser(snapshot.profilePayload);
        workingProfile = mergeProfileResponse(workingProfile, updated);
        setProfile(workingProfile);
        snapshot.profilePayload = {};
        snapshot.needsUserRefresh = true;
      }

      if (snapshot.needsUserRefresh) {
        await refreshUser();
      }

      setProfile(workingProfile);
      setInitialProfile(workingProfile);
      setPhotoFile(null);
      setPhotoMarkedForRemoval(false);
      pendingSaveRef.current = null;
      setPhotoRemovalError('');
      setSuccess('Profile updated successfully.');
      showToast('Profile updated successfully.');
      return true;
    } catch (err) {
      let message: string;
      if (err instanceof ApiError && err.status === 422) {
        const errors = (err.data as { errors?: Record<string, string[]> })?.errors;
        setFieldErrors(errors || {});
        setError('Please correct the errors below.');
        message = 'Please correct the errors below.';
      } else {
        message = err instanceof Error ? err.message : 'Failed to update profile';
        setError(message);
      }
      if (snapshot.photoAction === 'remove' || photoMarkedForRemoval) {
        setPhotoRemovalError(message);
        showToast(message, 'error');
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) {
      return;
    }

    const contactNumberError = canEditAlumniFields
      ? validatePhilippinePhoneNumber(profile.alumni?.contact_number || '')
      : undefined;

    if (contactNumberError) {
      setFieldErrors({ contact_number: [contactNumberError] });
      setError('Please correct the errors below.');

      return;
    }

    const pendingSave = createPendingSave();
    if (!pendingSave) {
      return;
    }

    const hasCurrentPhoto = !!(initialProfile?.alumni?.profile_photo_url ?? initialProfile?.photo_url);
    if (photoMarkedForRemoval && !photoFile && hasCurrentPhoto) {
      pendingSaveRef.current = pendingSave;
      setPhotoRemovalError('');
      setPhotoRemovalConfirmationOpen(true);
      return;
    }

    await saveProfile(pendingSave);
  }

  async function confirmPhotoRemoval() {
    const pendingSave = pendingSaveRef.current ?? createPendingSave();
    if (!pendingSave) {
      return;
    }

    if (await saveProfile(pendingSave)) {
      setPhotoRemovalConfirmationOpen(false);
    }
  }

  function handlePhotoFileSelected(file: File | null) {
    setPhotoFile(file);
    if (file) {
      setPhotoMarkedForRemoval(false);
    }
  }

  if (isLoading) {
    return (
      <SettingsLayout>
        <div className="grid animate-pulse gap-6 xl:grid-cols-3">
          <div className="space-y-4 rounded-lg border border-outline-variant/70 bg-white p-6 shadow-card xl:col-span-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 rounded-DEFAULT bg-surface-container" />
            ))}
          </div>
          <div className="h-56 self-start rounded-lg border border-outline-variant/70 bg-white shadow-card" />
        </div>
      </SettingsLayout>
    );
  }

  if (!profile) {
    return (
      <SettingsLayout>
        <div className="rounded-DEFAULT bg-error-container p-4 text-error" role="alert">
          {error || 'Failed to load profile.'}
        </div>
      </SettingsLayout>
    );
  }

  const contactNumberError = fieldErrors.contact_number?.[0] ?? validatePhilippinePhoneNumber(profile.alumni?.contact_number || '');

  const hasChanges =
    !!photoFile ||
    photoMarkedForRemoval ||
    profile.email !== initialProfile?.email ||
    profile.username !== initialProfile?.username ||
    (canEditAlumniFields && profile.alumni && initialProfile?.alumni
      ? profile.alumni.contact_number !== initialProfile.alumni.contact_number ||
        profile.alumni.address !== initialProfile.alumni.address ||
        profile.alumni.privacy !== initialProfile.alumni.privacy ||
        profile.alumni.gender !== initialProfile.alumni.gender ||
        profile.alumni.contact_email !== initialProfile.alumni.contact_email ||
        profile.alumni.birthdate !== initialProfile.alumni.birthdate ||
        profile.alumni.employment_status !== initialProfile.alumni.employment_status ||
        profile.alumni.company_name !== initialProfile.alumni.company_name ||
        profile.alumni.position_in_company !== initialProfile.alumni.position_in_company
      : false);

  return (
    <SettingsLayout>
      <div className="grid gap-6 xl:grid-cols-3">
        <form onSubmit={handleSave} className="overflow-hidden rounded-lg border border-outline-variant/70 bg-white shadow-card xl:col-span-2">
          <div className="flex items-center justify-between border-b border-outline-variant/70 px-6 py-4">
            <h2 className="text-headline-sm font-headline-sm text-on-surface">Profile</h2>
            <Button type="submit" disabled={isSaving || photoRemovalConfirmationOpen || !hasChanges} icon={Save} isLoading={isSaving} loadingText="Saving">
              Save Changes
            </Button>
          </div>

          <div className="space-y-6 p-6">
            {error && <FormErrorSummary message={error} fieldErrors={fieldErrors} />}

            {success && (
              <div className="flex items-center gap-1.5 rounded-DEFAULT bg-success-container p-3 text-body-md text-on-success-container" role="status">
                <CheckCircle2 size={16} aria-hidden="true" />
                {success}
              </div>
            )}

            <div className="space-y-6">
              <div className="mx-auto flex max-w-sm flex-col items-center">
                <label className="text-label-md font-label-md text-on-surface">Profile Picture</label>
                <div className="mt-3">
                  <ProfilePhotoUpload
                    currentPhotoUrl={photoMarkedForRemoval ? null : (profile.alumni?.profile_photo_url ?? profile.photo_url)}
                    onFileSelected={handlePhotoFileSelected}
                    onRemoveChange={setPhotoMarkedForRemoval}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  id="username"
                  label="Username"
                  type="text"
                  value={profile.username}
                  onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                />
                <TextField
                  id="email"
                  label="Email Address"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  error={fieldErrors.email?.[0]}
                />
              </div>
            </div>

            {canEditAlumniFields && profile.alumni && (
              <>
                <div className="border-t border-outline-variant pt-6">
                  <h3 className="text-headline-sm font-headline-sm text-on-surface">Alumni Profile</h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    id="contact_number"
                    label="Contact Number"
                    type="text"
                    value={profile.alumni.contact_number || ''}
                    onChange={(e) => setProfile({ ...profile, alumni: { ...profile.alumni!, contact_number: e.target.value || null } })}
                    error={contactNumberError}
                  />
                  <TextField
                    id="address"
                    label="Address"
                    type="text"
                    value={profile.alumni.address || ''}
                    onChange={(e) => setProfile({ ...profile, alumni: { ...profile.alumni!, address: e.target.value || null } })}
                  />
                  <SelectField
                    id="gender"
                    label="Gender"
                    value={profile.alumni.gender ?? ''}
                    onChange={(e) => setProfile({ ...profile, alumni: { ...profile.alumni!, gender: (e.target.value || null) as 'male' | 'female' | null } })}
                    error={fieldErrors.gender?.[0]}
                  >
                    <option value="">Not set</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </SelectField>
                  <div>
                    <label htmlFor="contact_email" className="flex items-center text-label-md font-label-md text-on-surface">
                      Contact Email
                      <span className="ml-1 inline-flex align-middle">
                        <Tooltip
                          label="About contact email"
                          content="The contact email tied to your school/alumni record is separate from your account login email above."
                        >
                          <CircleHelp size={15} aria-hidden="true" className="text-on-surface-variant" />
                        </Tooltip>
                      </span>
                    </label>
                    <TextField
                      id="contact_email"
                      label="Contact Email"
                      hideLabel
                      type="email"
                      value={profile.alumni.contact_email || ''}
                      onChange={(e) => setProfile({ ...profile, alumni: { ...profile.alumni!, contact_email: e.target.value || null } })}
                      error={fieldErrors.contact_email?.[0]}
                    />
                  </div>
                  <DateField
                    id="birthdate"
                    label="Birthdate"
                    max={new Date().toISOString().slice(0, 10)}
                    value={profile.alumni.birthdate || ''}
                    onChange={(e) => setProfile({ ...profile, alumni: { ...profile.alumni!, birthdate: e.target.value || null } })}
                    error={fieldErrors.birthdate?.[0]}
                  />
                  <SelectField
                    id="employment_status"
                    label="Employment Status (optional)"
                    value={profile.alumni.employment_status ?? ''}
                    onChange={(event) => {
                      const employmentStatus = EMPLOYMENT_STATUS_OPTIONS.find(({ value }) => value === event.target.value)?.value ?? null;
                      const hasWorkplace = employmentStatus === 'employed' || employmentStatus === 'self_employed';

                      setProfile({
                        ...profile,
                        alumni: {
                          ...profile.alumni!,
                          employment_status: employmentStatus,
                          company_name: hasWorkplace ? profile.alumni!.company_name : null,
                          position_in_company: hasWorkplace ? profile.alumni!.position_in_company : null,
                        },
                      });
                    }}
                    error={fieldErrors.employment_status?.[0]}
                  >
                    <option value="">Not set</option>
                    {EMPLOYMENT_STATUS_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </SelectField>
                  {(profile.alumni.employment_status === 'employed' || profile.alumni.employment_status === 'self_employed') && (
                    <>
                      <TextField
                        id="company_name"
                        label="Company Name *"
                        type="text"
                        value={profile.alumni.company_name ?? ''}
                        onChange={(event) => setProfile({ ...profile, alumni: { ...profile.alumni!, company_name: event.target.value || null } })}
                        required
                        error={fieldErrors.company_name?.[0]}
                      />
                      <TextField
                        id="position_in_company"
                        label="Position In Company *"
                        type="text"
                        value={profile.alumni.position_in_company ?? ''}
                        onChange={(event) => setProfile({ ...profile, alumni: { ...profile.alumni!, position_in_company: event.target.value || null } })}
                        required
                        error={fieldErrors.position_in_company?.[0]}
                      />
                    </>
                  )}
                  <div>
                    <label htmlFor="privacy" className="flex items-center text-label-md font-label-md text-on-surface">
                      Privacy Setting
                      <PrivacyHelp />
                    </label>
                    <SelectField
                      id="privacy"
                      label="Privacy Setting"
                      hideLabel
                      containerClassName="mt-1"
                      value={profile.alumni.privacy}
                      onChange={(e) => setProfile({ ...profile, alumni: { ...profile.alumni!, privacy: e.target.value as 'public' | 'private' } })}
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </SelectField>
                  </div>
                </div>
              </>
            )}
          </div>
        </form>

        <aside className="self-start overflow-hidden rounded-lg border border-outline-variant/70 bg-white shadow-card">
          <div className="border-b border-outline-variant/70 px-6 py-4">
            <h2 className="text-headline-sm font-headline-sm text-on-surface">Account Information</h2>
          </div>

          <dl className="space-y-5 p-6">
            <div>
              <dt className="text-label-sm font-label-sm text-on-surface-variant">Role</dt>
              <dd className="mt-1.5">
                <StatusBadge status={profile.role} />
              </dd>
            </div>
            <div>
              <dt className="text-label-sm font-label-sm text-on-surface-variant">Account Status</dt>
              <dd className="mt-1.5">
                <StatusBadge status={profile.account_status} />
              </dd>
            </div>
            <div>
              <dt className="text-label-sm font-label-sm text-on-surface-variant">Member Since</dt>
              <dd className="mt-1.5 text-body-md text-on-surface">
                {new Date(profile.created_at).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt className="text-label-sm font-label-sm text-on-surface-variant">Last Login</dt>
              <dd className="mt-1.5 text-body-md text-on-surface">
                {profile.last_login_at ? new Date(profile.last_login_at).toLocaleString() : 'Never'}
              </dd>
            </div>
          </dl>
        </aside>
      </div>

      <ConfirmDialog
        isOpen={photoRemovalConfirmationOpen}
        title="Remove profile photo?"
        message="Your current profile photo will be permanently removed. Other profile changes in this save will still be applied."
        confirmLabel="Remove photo and save"
        variant="danger"
        onConfirm={() => { void confirmPhotoRemoval(); }}
        onCancel={() => {
          if (!isSaving) {
            setPhotoRemovalConfirmationOpen(false);
            pendingSaveRef.current = null;
            setPhotoRemovalError('');
          }
        }}
        isLoading={isSaving}
        error={photoRemovalError || (photoRemovalConfirmationOpen ? error : '')}
        onRetry={() => { void confirmPhotoRemoval(); }}
      />
    </SettingsLayout>
  );
}
