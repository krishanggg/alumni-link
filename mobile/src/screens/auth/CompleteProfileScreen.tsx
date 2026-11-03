import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

import type { CompleteProfilePayload } from '../../types';

import { useAuth } from '../../contexts/AuthContext';
import FormRow from '../../components/shared/FormRow';
import AuthHeader from '../../components/shared/AuthHeader';
import {
  KeyboardAwareScrollView,
  KeyboardAwareTextInput,
} from '../../components/shared/KeyboardAwareScrollView';
import { SchoolPicker } from '../../components/registration/SchoolPicker';
import { DateField, toDateString } from '../../components/shared/DateField';
import { getLatestBirthdate } from '../../utils/birthdate';
import * as authService from '../../services/authService';
import { toFieldErrors } from '../../services/api';

import { colors, layout, presets, ripple, spacing, typography } from '../../theme';

interface FormState {
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  schoolId: number | null;
  graduationYear: string;
  sectionStrand: string;
  gender: string;
  birthdate: string;
  address: string;
  studentId: string;
  contactNumber: string;
}

const CURRENT_YEAR = new Date().getFullYear();
const TODAY = toDateString(new Date());


function blankToUndefined(value: string): string | undefined {
  return value.trim() ? value.trim() : undefined;
}

function buildPayload(state: FormState): CompleteProfilePayload {
  return {
    first_name: state.firstName.trim(),
    middle_name: blankToUndefined(state.middleName),
    last_name: state.lastName.trim(),
    suffix: blankToUndefined(state.suffix),
    school_id: state.schoolId as number,
    graduation_year: parseInt(state.graduationYear, 10),
    section_strand: state.sectionStrand.trim(),
    gender: state.gender as 'male' | 'female',
    birthdate: state.birthdate.trim(),
    address: blankToUndefined(state.address),
    student_id: blankToUndefined(state.studentId),
    contact_number: blankToUndefined(state.contactNumber),
  };
}

function CompleteProfileScreen() {
  const { user, logout } = useAuth();

  const [state, setState] = useState<FormState>({
    firstName: user?.alumni?.first_name ?? '',
    middleName: user?.alumni?.middle_name ?? '',
    lastName: user?.alumni?.last_name ?? '',
    suffix: user?.alumni?.suffix ?? '',
    schoolId: user?.school_id ?? null,
    graduationYear: user?.alumni?.graduation_year ? String(user.alumni.graduation_year) : '',
    sectionStrand: user?.alumni?.section_strand ?? '',
    gender: user?.alumni?.gender ?? '',
    birthdate: user?.alumni?.birthdate ?? '',
    address: user?.alumni?.address ?? '',
    studentId: user?.alumni?.student_id ?? '',
    contactNumber: user?.alumni?.contact_number ?? '',
  });

  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  function setField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setState((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function validate(): boolean {
    const errors: Record<string, string[]> = {};
    const gradYear = parseInt(state.graduationYear, 10);

    if (!state.firstName.trim()) {
      errors.first_name = ['Please enter your first name.'];
    }
    if (!state.lastName.trim()) {
      errors.last_name = ['Please enter your last name.'];
    }
    if (!state.schoolId) {
      errors.school_id = ['Please select your school.'];
    }
    if (!state.graduationYear) {
      errors.graduation_year = ['Please enter your graduation year.'];
    } else if (isNaN(gradYear) || gradYear < 1900 || gradYear > CURRENT_YEAR) {
      errors.graduation_year = ['Graduation year must be between 1900 and ' + CURRENT_YEAR + '.'];
    }
    if (!state.sectionStrand.trim()) {
      errors.section_strand = ['Please enter your section or strand.'];
    } else if (state.sectionStrand.length > 100) {
      errors.section_strand = ['Section / Strand must not exceed 100 characters.'];
    }
    if (state.gender !== 'male' && state.gender !== 'female') {
      errors.gender = ['Please select your gender.'];
    }
    if (!state.birthdate.trim()) {
      errors.birthdate = ['Please enter your birthdate.'];
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(state.birthdate)) {
      errors.birthdate = ['Please enter your birthdate as YYYY-MM-DD.'];
    } else if (state.birthdate >= TODAY) {
      errors.birthdate = ['Birthdate must be before today.'];
    }
    if (state.address && state.address.length > 500) {
      errors.address = ['Address must not exceed 500 characters.'];
    }
    if (state.studentId && state.studentId.length > 50) {
      errors.student_id = ['Student ID must not exceed 50 characters.'];
    }
    if (state.contactNumber && !/^(09\d{9}|\+639\d{9})$/.test(state.contactNumber)) {
      errors.contact_number = ['Please enter a valid Philippine mobile number (e.g. 09123456789).'];
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    setError('');
    setFieldErrors({});

    if (!validate()) {
      setError('Please correct the errors below.');
      return;
    }

    setIsSubmitting(true);

    try {
      await authService.completeProfile(buildPayload(state));
      setIsSuccess(true);
    } catch (err) {
      const serverErrors = toFieldErrors(err);
      if (Object.keys(serverErrors).length > 0) {
        setFieldErrors(serverErrors);
        setError('Please correct the errors below.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to submit. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSuccess) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successTitle}>Profile Submitted</Text>
        <Text style={styles.successBody}>
          Your alumni profile details have been submitted for admin approval. You'll be able to
          access the app once your profile is reviewed.
        </Text>
        <Pressable
          style={styles.submitButton}
          onPress={() => logout()}
          android_ripple={ripple.onDark}
          accessibilityRole="button"
          accessibilityLabel="Back to login"
        >
          <Text style={styles.submitButtonText}>Back to Login</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <AuthHeader
        title="Complete Your Profile"
        actionLabel="Log Out"
        onAction={() => logout()}
        actionDisabled={isSubmitting}
      />

      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>
          Your alumni account has been approved, but your alumni profile needs to be completed
          before you can access the app.
        </Text>

        <Text style={styles.sectionLabel}>Personal Information</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>First Name *</Text>
          <KeyboardAwareTextInput
            style={[styles.input, fieldErrors.first_name ? styles.inputError : null]}
            value={state.firstName}
            onChangeText={(v) => setField('firstName', v)}
            placeholder="First Name"
            autoCapitalize="words"
          />
          {fieldErrors.first_name ? <Text style={styles.fieldError}>{fieldErrors.first_name[0]}</Text> : null}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Middle Name</Text>
          <KeyboardAwareTextInput
            style={[styles.input, fieldErrors.middle_name ? styles.inputError : null]}
            value={state.middleName}
            onChangeText={(v) => setField('middleName', v)}
            placeholder="Middle Name"
            autoCapitalize="words"
          />
          {fieldErrors.middle_name ? <Text style={styles.fieldError}>{fieldErrors.middle_name[0]}</Text> : null}
        </View>

        <FormRow>
          <View style={[styles.fieldGroup, styles.flex1]}>
            <Text style={styles.label}>Last Name *</Text>
            <KeyboardAwareTextInput
              style={[styles.input, fieldErrors.last_name ? styles.inputError : null]}
              value={state.lastName}
              onChangeText={(v) => setField('lastName', v)}
              placeholder="Last Name"
              autoCapitalize="words"
            />
            {fieldErrors.last_name ? <Text style={styles.fieldError}>{fieldErrors.last_name[0]}</Text> : null}
          </View>
          <View style={[styles.fieldGroup, styles.flex1]}>
            <Text style={styles.label}>Suffix</Text>
            <KeyboardAwareTextInput
              style={[styles.input, fieldErrors.suffix ? styles.inputError : null]}
              value={state.suffix}
              onChangeText={(v) => setField('suffix', v)}
              placeholder="Jr., III"
              autoCapitalize="words"
            />
            {fieldErrors.suffix ? <Text style={styles.fieldError}>{fieldErrors.suffix[0]}</Text> : null}
          </View>
        </FormRow>

        <Text style={styles.sectionLabel}>Alumni Information</Text>

        <SchoolPicker
          value={state.schoolId}
          onChange={(id) => setField('schoolId', id)}
          error={fieldErrors.school_id?.[0]}
          required
        />

        <View style={styles.row}>
          <View style={[styles.fieldGroup, styles.flex1]}>
            <Text style={styles.label}>Graduation Year *</Text>
            <KeyboardAwareTextInput
              style={[styles.input, fieldErrors.graduation_year ? styles.inputError : null]}
              value={state.graduationYear}
              onChangeText={(v) => setField('graduationYear', v)}
              placeholder="e.g. 2024"
              keyboardType="numeric"
              maxLength={4}
            />
            {fieldErrors.graduation_year ? (
              <Text style={styles.fieldError}>{fieldErrors.graduation_year[0]}</Text>
            ) : null}
          </View>
          <View style={[styles.fieldGroup, styles.flex1]}>
            <Text style={styles.label}>Section / Strand *</Text>
            <KeyboardAwareTextInput
              style={[styles.input, fieldErrors.section_strand ? styles.inputError : null]}
              value={state.sectionStrand}
              onChangeText={(v) => setField('sectionStrand', v)}
              placeholder="e.g. STEM A"
              maxLength={100}
            />
            {fieldErrors.section_strand ? (
              <Text style={styles.fieldError}>{fieldErrors.section_strand[0]}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.fieldGroup, styles.flex1]}>
            <Text style={styles.label}>Gender *</Text>
            <View style={[styles.pickerContainer, fieldErrors.gender ? styles.inputError : null]}>
              <Picker
                style={styles.picker}
                selectedValue={state.gender || undefined}
                onValueChange={(v: string) => setField('gender', v)}
              >
                <Picker.Item label="Select" value="" />
                <Picker.Item label="Male" value="male" />
                <Picker.Item label="Female" value="female" />
              </Picker>
            </View>
            {fieldErrors.gender ? (
              <Text style={styles.fieldError}>{fieldErrors.gender[0]}</Text>
            ) : null}
          </View>
          <View style={styles.flex1}>
            <DateField
              label="Birthdate *"
              value={state.birthdate}
              onChange={(v) => setField('birthdate', v)}
              error={fieldErrors.birthdate?.[0]}
              maximumDate={getLatestBirthdate()}
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Address</Text>
          <KeyboardAwareTextInput
            style={[styles.input, styles.textArea, fieldErrors.address ? styles.inputError : null]}
            value={state.address}
            onChangeText={(v) => setField('address', v)}
            placeholder="Your address"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            maxLength={500}
          />
          {fieldErrors.address ? (
            <Text style={styles.fieldError}>{fieldErrors.address[0]}</Text>
          ) : null}
        </View>

        <FormRow stackWhenNarrow>
          <View style={[styles.fieldGroup, styles.flex1]}>
            <Text style={styles.label}>Student ID</Text>
            <KeyboardAwareTextInput
              style={[styles.input, fieldErrors.student_id ? styles.inputError : null]}
              value={state.studentId}
              onChangeText={(v) => setField('studentId', v)}
              placeholder="Optional"
              autoCapitalize="none"
              maxLength={50}
            />
            {fieldErrors.student_id ? (
              <Text style={styles.fieldError}>{fieldErrors.student_id[0]}</Text>
            ) : null}
          </View>
          <View style={[styles.fieldGroup, styles.flex1]}>
            <Text style={styles.label}>Contact Number</Text>
            <KeyboardAwareTextInput
              style={[styles.input, fieldErrors.contact_number ? styles.inputError : null]}
              value={state.contactNumber}
              onChangeText={(v) => setField('contactNumber', v)}
              placeholder="09XXXXXXXXX"
              keyboardType="phone-pad"
            />
            {fieldErrors.contact_number ? (
              <Text style={styles.fieldError}>{fieldErrors.contact_number[0]}</Text>
            ) : null}
          </View>
        </FormRow>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          android_ripple={ripple.onDark}
          accessibilityRole="button"
          accessibilityLabel={isSubmitting ? 'Submitting for approval' : 'Submit for approval'}
          accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Text style={styles.submitButtonText}>Submit for Approval</Text>
          )}
        </Pressable>
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    ...presets.sectionLabel,
  },
  fieldGroup: {
    ...presets.fieldGroup,
  },
  label: {
    ...presets.fieldLabel,
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
  input: {
    ...presets.input,
  },
  inputError: {
    ...presets.inputRowError,
  },
  textArea: {
    ...presets.textArea,
  },
  fieldError: {
    ...presets.fieldError,
  },
  pickerContainer: {
    ...presets.pickerContainer,
  },
  picker: {
    ...presets.picker,
  },
  row: {
    ...presets.formRow,
  },
  errorBox: {
    ...presets.errorAlert,
    marginBottom: layout.cardGap,
  },
  errorText: {
    ...presets.errorAlertText,
  },
  submitButton: {
    ...presets.primaryButton,
  },
  buttonDisabled: {
    ...presets.buttonDisabled,
  },
  submitButtonText: {
    ...presets.primaryButtonText,
  },
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heading: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginBottom: 24,
  },
  flex1: {
    flex: 1,
  },
  successContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    padding: 24,
  },
  successTitle: {
    ...typography.headlineLg,
    color: colors.onSurface,
    textAlign: 'center',
  },
  successBody: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
});

export default CompleteProfileScreen;
