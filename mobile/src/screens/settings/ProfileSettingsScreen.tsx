import { useState } from 'react';
import {
  View, Text, Pressable,
  StyleSheet, ActivityIndicator,
  Platform, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';

import type { EmploymentStatus } from '../../types';
import type { ProfileResponse, UpdateProfilePayload } from '../../types/settings';

import { DateField } from '../../components/shared/DateField';
import ErrorAlert from '../../components/shared/ErrorAlert';
import {
  KeyboardAwareScrollView,
  KeyboardAwareTextInput,
} from '../../components/shared/KeyboardAwareScrollView';
import { ProfileSettingsSkeleton } from '../../components/skeletons/ProfileSettingsSkeleton';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../hooks/useSettings';
import { SKELETON_DELAY_MS, useDelayedFlag } from '../../hooks/useDelayedFlag';

import { toFieldErrors, resolveStorageUrl } from '../../services/api';

import { EMPLOYMENT_STATUS_OPTIONS } from '../../constants/employmentStatus';
import { validatePhilippinePhoneNumber } from '../../utils/phValidation';
import { getLatestBirthdate } from '../../utils/birthdate';

import {
  colors, extendedColors, layout, presets, radius, ripple, spacing, typography,
} from '../../theme';

const PRIVACY_OPTIONS: { label: string; value: 'public' | 'private' }[] = [
  { label: 'Public', value: 'public' },
  { label: 'Private', value: 'private' },
];


const GENDER_OPTIONS: { label: string; value: 'male' | 'female' | '' }[] = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Not set', value: '' },
];

/**
 * Mounted only once a profile exists, so field state can be seeded from the
 * loaded profile in `useState` initialisers rather than by an effect that
 * fires after the first paint. Background revalidation deliberately does not
 * re-seed these fields — that would discard whatever the user is part-way
 * through typing.
 */
function ProfileSettingsForm({ loaded }: { loaded: ProfileResponse }) {
  const { user: authUser, applyUser } = useAuth();
  const { updateProfile, uploadPhoto, deletePhoto, isSaving } = useProfile();

  const [profile, setProfile] = useState<ProfileResponse>(loaded);
  const [initialProfile, setInitialProfile] = useState<ProfileResponse>(loaded);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | undefined>(undefined);

  const [email, setEmail] = useState(loaded.email || '');
  const [username, setUsername] = useState(loaded.username || '');
  const [contactNumber, setContactNumber] = useState(loaded.alumni?.contact_number || '');
  const [address, setAddress] = useState(loaded.alumni?.address || '');
  const [gender, setGender] = useState<'male' | 'female' | ''>(loaded.alumni?.gender || '');
  const [birthdate, setBirthdate] = useState(loaded.alumni?.birthdate || '');
  const [contactEmail, setContactEmail] = useState(loaded.alumni?.contact_email || '');
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus | ''>(
    loaded.alumni?.employment_status ?? '',
  );
  const [companyName, setCompanyName] = useState(loaded.alumni?.company_name || '');
  const [positionInCompany, setPositionInCompany] = useState(loaded.alumni?.position_in_company || '');
  const [privacy, setPrivacy] = useState<'public' | 'private'>(
    loaded.alumni?.privacy || 'public',
  );

  const canEditAlumniFields = profile.role === 'alumni' && profile.alumni_id !== null;

  function applyProfileResponse(response: ProfileResponse) {
    setProfile(response);
    setInitialProfile(response);
    setEmail(response.email || '');
    setUsername(response.username || '');
    setContactNumber(response.alumni?.contact_number || '');
    setAddress(response.alumni?.address || '');
    setGender((response.alumni?.gender || '') as 'male' | 'female' | '');
    setBirthdate(response.alumni?.birthdate || '');
    setContactEmail(response.alumni?.contact_email || '');
    setEmploymentStatus(response.alumni?.employment_status ?? '');
    setCompanyName(response.alumni?.company_name || '');
    setPositionInCompany(response.alumni?.position_in_company || '');
    setPrivacy(response.alumni?.privacy || 'public');

    if (authUser) {
      // `/auth/me` (and every avatar sourced from the auth user — the profile
      // menu, the dashboard header) resolves the photo with an alumni-record
      // fallback, so mirror that precedence here. Without this the auth user
      // keeps its stale photo after an upload/removal until the next full
      // reload, which is exactly what alumni reported.
      const effectivePhotoUrl =
        response.alumni?.profile_photo_url ?? response.photo_url ?? null;
      applyUser({
        ...authUser,
        name: response.name,
        email: response.email,
        username: response.username,
        photo_url: effectivePhotoUrl,
        alumni: authUser.alumni && response.alumni
          ? {
              ...authUser.alumni,
              employment_status: response.alumni.employment_status,
              company_name: response.alumni.company_name,
              position_in_company: response.alumni.position_in_company,
            }
          : authUser.alumni,
      });
    }
  }

  function handleFieldChange(setter: (v: string) => void) {
    return (value: string) => {
      setter(value);
      setSuccessMessage(null);
      setFieldErrors({});
      setGeneralError(null);
    };
  }

  async function handlePickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow photo library access to upload a profile photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) return;

    const asset = result.assets[0];

    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      Alert.alert('File Too Large', 'Profile photo must be under 5MB.');
      return;
    }

    const mimeType = asset.mimeType || 'image/jpeg';
    if (mimeType !== 'image/jpeg' && mimeType !== 'image/png') {
      Alert.alert('Invalid Format', 'Only JPG and PNG images are accepted.');
      return;
    }

    setFieldErrors({});
    setGeneralError(null);
    setSuccessMessage(null);

    try {
      const updated = await uploadPhoto({ uri: asset.uri });
      applyProfileResponse(updated);
      setSuccessMessage('Profile photo updated successfully.');
    } catch (error) {
      setGeneralError(
        error instanceof Error ? error.message : 'Could not upload photo. Please try again.',
      );
    }
  }

  async function handleRemovePhoto() {
    setFieldErrors({});
    setGeneralError(null);
    setSuccessMessage(null);

    try {
      const updated = await deletePhoto();
      applyProfileResponse(updated);
      setSuccessMessage('Profile photo removed.');
    } catch (error) {
      setGeneralError(
        error instanceof Error ? error.message : 'Could not remove photo. Please try again.',
      );
    }
  }

  function buildPayload(): Record<string, unknown> | null {
    const payload: Record<string, unknown> = {};
    const initial = initialProfile;

    if (email !== initial.email) {
      payload.email = email;
    }
    if (username !== initial.username) {
      payload.username = username;
    }

    const initialAlumni = initial.alumni;
    if (canEditAlumniFields && profile.alumni && initialAlumni) {
      if (contactNumber !== (initialAlumni.contact_number || '')) {
        payload.contact_number = contactNumber || null;
      }
      if (address !== (initialAlumni.address || '')) {
        payload.address = address || null;
      }
      if (gender !== (initialAlumni.gender || '')) {
        payload.gender = gender || null;
      }
      if (birthdate !== (initialAlumni.birthdate || '')) {
        payload.birthdate = birthdate || null;
      }
      if (contactEmail !== (initialAlumni.contact_email || '')) {
        payload.contact_email = contactEmail || null;
      }
      if (privacy !== initialAlumni.privacy) {
        payload.privacy = privacy;
      }

      const employmentStatusChanged = employmentStatus !== (initialAlumni.employment_status ?? '');
      const companyNameChanged = companyName !== (initialAlumni.company_name || '');
      const positionInCompanyChanged = positionInCompany !== (initialAlumni.position_in_company || '');

      if (employmentStatusChanged || companyNameChanged || positionInCompanyChanged) {
        const hasWorkplace = employmentStatus === 'employed' || employmentStatus === 'self_employed';
        payload.employment_status = employmentStatus || null;
        payload.company_name = hasWorkplace ? companyName.trim() || null : null;
        payload.position_in_company = hasWorkplace ? positionInCompany.trim() || null : null;
      }
    }

    if (Object.keys(payload).length === 0) return null;
    return payload;
  }

  async function handleSave() {
    setFieldErrors({});
    setGeneralError(null);
    setSuccessMessage(null);

    const phoneValidationError = validatePhilippinePhoneNumber(contactNumber);
    if (phoneValidationError) {
      setPhoneError(phoneValidationError);
      return;
    }

    if (employmentStatus === 'employed' || employmentStatus === 'self_employed') {
      const employmentErrors: Record<string, string[]> = {};

      if (!companyName.trim()) {
        employmentErrors.company_name = ['Company Name is required.'];
      }
      if (!positionInCompany.trim()) {
        employmentErrors.position_in_company = ['Position In Company is required.'];
      }

      if (Object.keys(employmentErrors).length > 0) {
        setFieldErrors(employmentErrors);
        return;
      }
    }

    const payload = buildPayload();
    if (!payload) {
      setSuccessMessage('No changes to save.');
      return;
    }

    try {
      const updated = await updateProfile(payload as UpdateProfilePayload);
      applyProfileResponse(updated);
      setSuccessMessage('Profile updated successfully.');
    } catch (error) {
      const errors = toFieldErrors(error);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
      } else {
        setGeneralError(
          error instanceof Error ? error.message : 'Could not save profile. Please try again.',
        );
      }
    }
  }

  function renderFieldError(field: string): React.JSX.Element | null {
    const messages = fieldErrors[field];
    if (!messages || messages.length === 0) return null;
    return <Text style={styles.fieldError}>{messages[0]}</Text>;
  }

  const activePhotoUrl = profile.alumni?.profile_photo_url
    ? resolveStorageUrl(profile.alumni.profile_photo_url)
    : profile.photo_url
      ? resolveStorageUrl(profile.photo_url)
      : null;

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      {canEditAlumniFields && (
        <View style={styles.photoSection}>
          {activePhotoUrl ? (
            <Image source={{ uri: activePhotoUrl }} style={styles.photoPreview} />
          ) : (
            <View style={[styles.photoPreview, styles.photoPlaceholder]}>
              <Text style={styles.photoPlaceholderText}>
                {(profile.alumni?.first_name?.[0] || '')}{(profile.alumni?.last_name?.[0] || '')}
              </Text>
            </View>
          )}
          <View style={styles.photoActions}>
            <Pressable
              style={styles.photoButton}
              onPress={handlePickPhoto}
              disabled={isSaving}
              android_ripple={ripple.onLight}
              accessibilityRole="button"
              accessibilityLabel={activePhotoUrl ? 'Change photo' : 'Upload photo'}
            >
              <Text style={styles.photoButtonText}>
                {activePhotoUrl ? 'Change Photo' : 'Upload Photo'}
              </Text>
            </Pressable>
            {activePhotoUrl && (
              <Pressable
                style={styles.photoRemoveButton}
                onPress={handleRemovePhoto}
                disabled={isSaving}
                android_ripple={ripple.onLight}
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
              >
                <Text style={styles.photoRemoveText}>Remove</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>Account Information</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Email Address</Text>
        <Text style={styles.helperText}>Your account login email</Text>
        <KeyboardAwareTextInput
          style={[styles.input, fieldErrors.email ? styles.inputError : null]}
          value={email}
          onChangeText={handleFieldChange(setEmail)}
          placeholder="you@example.com"
          placeholderTextColor={colors.outline}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {renderFieldError('email')}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Username</Text>
        <KeyboardAwareTextInput
          style={[styles.input, fieldErrors.username ? styles.inputError : null]}
          value={username}
          onChangeText={handleFieldChange(setUsername)}
          placeholder="your.username"
          placeholderTextColor={colors.outline}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {renderFieldError('username')}
      </View>

      {canEditAlumniFields && (
        <>
          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Alumni Record</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Contact Number</Text>
            <KeyboardAwareTextInput
              style={[styles.input, (fieldErrors.contact_number || phoneError) ? styles.inputError : null]}
              value={contactNumber}
              onChangeText={(v) => { setContactNumber(v); setPhoneError(undefined); setSuccessMessage(null); }}
              placeholder="+639XXXXXXXXX"
              placeholderTextColor={colors.outline}
              keyboardType="phone-pad"
            />
            {phoneError ? <Text style={styles.fieldError}>{phoneError}</Text> : null}
            {renderFieldError('contact_number')}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Address</Text>
            <KeyboardAwareTextInput
              style={[styles.input, fieldErrors.address ? styles.inputError : null]}
              value={address}
              onChangeText={handleFieldChange(setAddress)}
              placeholder="Your address"
              placeholderTextColor={colors.outline}
            />
            {renderFieldError('address')}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.pickerWrapper}>
              {Platform.OS === 'ios' ? (
                <View style={styles.segmentedControl}>
                  {GENDER_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.value}
                      style={[
                        styles.segmentedOption,
                        gender === opt.value && styles.segmentedOptionActive,
                      ]}
                      onPress={() => { setGender(opt.value); setSuccessMessage(null); }}
                      android_ripple={ripple.onLight}
                      accessibilityRole="radio"
                      accessibilityLabel={opt.label}
                      accessibilityState={{ selected: gender === opt.value }}
                    >
                      <Text
                        style={[
                          styles.segmentedOptionText,
                          gender === opt.value && styles.segmentedOptionTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View style={styles.pickerContainer}>
                  {GENDER_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.value}
                      style={[
                        styles.chipButton,
                        gender === opt.value && styles.chipButtonActive,
                      ]}
                      onPress={() => { setGender(opt.value); setSuccessMessage(null); }}
                      android_ripple={ripple.onLight}
                      accessibilityRole="radio"
                      accessibilityLabel={opt.label}
                      accessibilityState={{ selected: gender === opt.value }}
                    >
                      <Text
                        style={[
                          styles.chipButtonText,
                          gender === opt.value && styles.chipButtonTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
            {renderFieldError('gender')}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Contact Email</Text>
            <Text style={styles.helperText}>
              Email tied to your school record, separate from your login email
            </Text>
            <KeyboardAwareTextInput
              style={[styles.input, fieldErrors.contact_email ? styles.inputError : null]}
              value={contactEmail}
              onChangeText={handleFieldChange(setContactEmail)}
              placeholder="alumni@example.com"
              placeholderTextColor={colors.outline}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {renderFieldError('contact_email')}
          </View>

          <DateField
            label="Birthdate"
            value={birthdate}
            onChange={handleFieldChange(setBirthdate)}
            error={fieldErrors.birthdate?.[0]}
            maximumDate={getLatestBirthdate()}
          />

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Employment Status (optional)</Text>
            <View style={[styles.employmentPickerContainer, fieldErrors.employment_status ? styles.inputError : null]}>
              <Picker
                style={styles.employmentPicker}
                selectedValue={employmentStatus}
                onValueChange={(value) => {
                  const nextStatus = EMPLOYMENT_STATUS_OPTIONS.find((option) => option.value === String(value))?.value ?? '';
                  setEmploymentStatus(nextStatus);
                  if (nextStatus !== 'employed' && nextStatus !== 'self_employed') {
                    setCompanyName('');
                    setPositionInCompany('');
                  }
                  setSuccessMessage(null);
                  setFieldErrors({});
                  setGeneralError(null);
                }}
                accessibilityLabel="Employment Status"
              >
                <Picker.Item label="Not set" value="" />
                {EMPLOYMENT_STATUS_OPTIONS.map(({ value, label }) => (
                  <Picker.Item key={value} label={label} value={value} />
                ))}
              </Picker>
            </View>
            {renderFieldError('employment_status')}
          </View>

          {(employmentStatus === 'employed' || employmentStatus === 'self_employed') ? (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Company Name *</Text>
                <KeyboardAwareTextInput
                  style={[styles.input, fieldErrors.company_name ? styles.inputError : null]}
                  value={companyName}
                  onChangeText={handleFieldChange(setCompanyName)}
                  placeholder="Company Name"
                  autoCapitalize="words"
                />
                {renderFieldError('company_name')}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Position In Company *</Text>
                <KeyboardAwareTextInput
                  style={[styles.input, fieldErrors.position_in_company ? styles.inputError : null]}
                  value={positionInCompany}
                  onChangeText={handleFieldChange(setPositionInCompany)}
                  placeholder="Position In Company"
                  autoCapitalize="words"
                />
                {renderFieldError('position_in_company')}
              </View>
            </>
          ) : null}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Directory Privacy</Text>
            <View style={styles.pickerWrapper}>
              {Platform.OS === 'ios' ? (
                <View style={styles.segmentedControl}>
                  {PRIVACY_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.value}
                      style={[
                        styles.segmentedOption,
                        privacy === opt.value && styles.segmentedOptionActive,
                      ]}
                      onPress={() => { setPrivacy(opt.value); setSuccessMessage(null); }}
                      android_ripple={ripple.onLight}
                      accessibilityRole="radio"
                      accessibilityLabel={opt.label}
                      accessibilityState={{ selected: privacy === opt.value }}
                    >
                      <Text
                        style={[
                          styles.segmentedOptionText,
                          privacy === opt.value && styles.segmentedOptionTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View style={styles.pickerContainer}>
                  {PRIVACY_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.value}
                      style={[
                        styles.chipButton,
                        privacy === opt.value && styles.chipButtonActive,
                      ]}
                      onPress={() => { setPrivacy(opt.value); setSuccessMessage(null); }}
                      android_ripple={ripple.onLight}
                      accessibilityRole="radio"
                      accessibilityLabel={opt.label}
                      accessibilityState={{ selected: privacy === opt.value }}
                    >
                      <Text
                        style={[
                          styles.chipButtonText,
                          privacy === opt.value && styles.chipButtonTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
            <Text style={styles.helperText}>
              Contact information is always private. Public exposes directory fields (name,
              photo, school, graduation year, section). Private hides your profile from
              directory and search.
            </Text>
            {renderFieldError('privacy')}
          </View>
        </>
      )}

      {successMessage ? (
        <View style={styles.successAlert}>
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      ) : null}

      {generalError ? <ErrorAlert message={generalError} style={styles.alert} /> : null}

      <Pressable
        style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={isSaving}
        android_ripple={ripple.onDark}
        accessibilityRole="button"
        accessibilityLabel={isSaving ? 'Saving changes' : 'Save changes'}
        accessibilityState={{ disabled: isSaving, busy: isSaving }}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color={colors.onPrimary} />
        ) : (
          <Text style={styles.saveButtonText}>Save Changes</Text>
        )}
      </Pressable>

      <View style={styles.bottomSpacer} />
    </KeyboardAwareScrollView>
  );
}

function ProfileSettingsScreen() {
  const { profile, isLoading, error, refetch } = useProfile();
  const showSkeleton = useDelayedFlag(isLoading, SKELETON_DELAY_MS);

  if (isLoading) {
    return showSkeleton ? <ProfileSettingsSkeleton /> : <View style={styles.loadingContainer} />;
  }

  if (error || !profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{error ?? 'Could not load profile. Please try again.'}</Text>
        <Pressable
          onPress={() => refetch()}
          style={styles.retryButton}
          android_ripple={ripple.onDark}
          accessibilityRole="button"
          accessibilityLabel="Retry loading profile"
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return <ProfileSettingsForm loaded={profile} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  photoPreview: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  photoPlaceholder: {
    // Matches the avatar tint used by the dashboard, directory rows and the
    // profile sheet — one person's placeholder is one colour app-wide.
    backgroundColor: colors.primaryFixed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    ...typography.displayLg,
    color: colors.onPrimaryFixedVariant,
  },
  photoActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  photoButton: {
    ...presets.secondaryButton,
    paddingHorizontal: layout.cardGap,
  },
  photoButtonText: {
    ...presets.secondaryButtonText,
    fontSize: 13,
  },
  photoRemoveButton: {
    ...presets.secondaryButton,
    paddingHorizontal: layout.cardGap,
  },
  photoRemoveText: {
    ...presets.secondaryButtonText,
    fontSize: 13,
    color: colors.error,
  },
  sectionTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    marginBottom: layout.cardGap,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceContainerHighest,
    marginVertical: spacing.xl,
  },
  fieldGroup: {
    marginBottom: layout.cardGap,
  },
  flex1: {
    flex: 1,
  },
  flex3: {
    flex: 3,
  },
  label: {
    ...presets.fieldLabel,
    color: colors.onSurface,
  },
  helperText: {
    ...typography.labelSm,
    fontWeight: '400',
    color: colors.outline,
    marginBottom: 6,
  },
  input: {
    ...presets.input,
  },
  inputError: {
    ...presets.inputRowError,
  },
  employmentPickerContainer: {
    ...presets.pickerContainer,
    marginTop: 2,
  },
  employmentPicker: {
    ...presets.picker,
  },
  fieldError: {
    ...presets.fieldError,
    marginLeft: 0,
  },
  pickerWrapper: {
    marginTop: 2,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.base,
    padding: 2,
  },
  segmentedOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentedOptionActive: {
    backgroundColor: colors.surfaceContainerLowest,
  },
  segmentedOptionText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  segmentedOptionTextActive: {
    fontWeight: '600',
    color: colors.onSurface,
  },
  pickerContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chipButton: {
    flex: 1,
    borderRadius: radius.base,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    backgroundColor: colors.surfaceContainerLowest,
    paddingVertical: 10,
    alignItems: 'center',
  },
  chipButtonActive: {
    borderColor: colors.accent,
    backgroundColor: colors.infoContainer,
  },
  chipButtonText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  chipButtonTextActive: {
    fontWeight: '600',
    color: colors.accent,
  },
  successAlert: {
    backgroundColor: colors.successContainer,
    borderRadius: radius.base,
    borderWidth: 1,
    borderColor: extendedColors.successContainerBorder,
    padding: spacing.md,
    marginBottom: layout.cardGap,
    marginTop: spacing.sm,
  },
  successText: {
    ...typography.labelSm,
    color: colors.onSuccessContainer,
  },
  alert: {
    marginBottom: layout.cardGap,
    marginTop: spacing.sm,
  },
  errorText: {
    ...typography.bodyMd,
    fontWeight: '500',
    color: colors.onErrorContainer,
    textAlign: 'center',
  },
  retryButton: {
    ...presets.primaryButton,
    paddingHorizontal: spacing.xl,
  },
  retryText: {
    ...presets.primaryButtonText,
    ...typography.labelMd,
  },
  saveButton: {
    ...presets.primaryButton,
    marginTop: spacing.sm,
  },
  saveButtonDisabled: {
    ...presets.buttonDisabled,
  },
  saveButtonText: {
    ...presets.primaryButtonText,
  },
  bottomSpacer: {
    height: spacing.xl,
  },
});

export default ProfileSettingsScreen;
