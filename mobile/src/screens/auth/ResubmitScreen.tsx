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

import type { EmploymentStatus, ResubmitPayload } from '../../types';

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
import { EMPLOYMENT_STATUS_OPTIONS } from '../../constants/employmentStatus';

import { colors, layout, presets, ripple, spacing, typography } from '../../theme';

interface ResubmitFormState {
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  email: string;
  username: string;
  schoolId: number | null;
  graduationYear: string;
  sectionStrand: string;
  gender: string;
  birthdate: string;
  address: string;
  studentId: string;
  contactNumber: string;
  employmentStatus: EmploymentStatus | '';
  companyName: string;
  positionInCompany: string;
}

const CURRENT_YEAR = new Date().getFullYear();
const TODAY = toDateString(new Date());


function blankToUndefined(value: string): string | undefined {
  return value.trim() ? value.trim() : undefined;
}

function buildPayload(state: ResubmitFormState): ResubmitPayload {
  return {
    first_name: blankToUndefined(state.firstName),
    middle_name: blankToUndefined(state.middleName),
    last_name: blankToUndefined(state.lastName),
    suffix: blankToUndefined(state.suffix),
    email: blankToUndefined(state.email),
    username: blankToUndefined(state.username),
    school_id: state.schoolId ?? undefined,
    graduation_year: state.graduationYear ? parseInt(state.graduationYear, 10) : undefined,
    section_strand: blankToUndefined(state.sectionStrand),
    gender: (state.gender === 'male' || state.gender === 'female') ? state.gender : undefined,
    birthdate: blankToUndefined(state.birthdate),
    address: blankToUndefined(state.address),
    student_id: blankToUndefined(state.studentId),
    contact_number: blankToUndefined(state.contactNumber),
    employment_status: state.employmentStatus || null,
    company_name: blankToUndefined(state.companyName),
    position_in_company: blankToUndefined(state.positionInCompany),
  };
}

interface ResubmitScreenProps {
  onCancel: () => void;
  onSuccess: () => void;
}

function ResubmitScreen({ onCancel, onSuccess }: ResubmitScreenProps) {
  const { user } = useAuth();

  const [state, setState] = useState<ResubmitFormState>({
    firstName: user?.alumni?.first_name ?? '',
    middleName: user?.alumni?.middle_name ?? '',
    lastName: user?.alumni?.last_name ?? '',
    suffix: user?.alumni?.suffix ?? '',
    email: user?.email ?? '',
    username: user?.username ?? '',
    schoolId: user?.school_id ?? null,
    graduationYear: user?.alumni?.graduation_year ? String(user.alumni.graduation_year) : '',
    sectionStrand: user?.alumni?.section_strand ?? '',
    gender: user?.alumni?.gender ?? '',
    birthdate: user?.alumni?.birthdate ?? '',
    address: user?.alumni?.address ?? '',
    studentId: user?.alumni?.student_id ?? '',
    contactNumber: user?.alumni?.contact_number ?? '',
    employmentStatus: user?.alumni?.employment_status ?? '',
    companyName: user?.alumni?.company_name ?? '',
    positionInCompany: user?.alumni?.position_in_company ?? '',
  });

  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function setField<K extends keyof ResubmitFormState>(field: K, value: ResubmitFormState[K]) {
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

    if (state.graduationYear && (isNaN(gradYear) || gradYear < 1900 || gradYear > CURRENT_YEAR)) {
      errors.graduation_year = ['Graduation year must be between 1900 and ' + CURRENT_YEAR + '.'];
    }
    if (state.username && !/^[a-zA-Z0-9_]+$/.test(state.username)) {
      errors.username = ['Username may only contain letters, numbers, and underscores.'];
    }
    if (state.email && !/\S+@\S+\.\S+/.test(state.email)) {
      errors.email = ['Please enter a valid email address.'];
    }
    if (state.contactNumber && !/^(09\d{9}|\+639\d{9})$/.test(state.contactNumber)) {
      errors.contact_number = ['Please enter a valid Philippine mobile number (e.g. 09123456789).'];
    }
    if (state.birthdate && state.birthdate >= TODAY) {
      errors.birthdate = ['Birthdate must be before today.'];
    }
    if (state.employmentStatus === 'employed' || state.employmentStatus === 'self_employed') {
      if (!state.companyName.trim()) {
        errors.company_name = ['Company Name is required.'];
      }
      if (!state.positionInCompany.trim()) {
        errors.position_in_company = ['Position In Company is required.'];
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    setError('');
    setFieldErrors({});

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const payload = buildPayload(state);
      await authService.resubmit(payload);
      onSuccess();
    } catch (err) {
      const serverErrors = toFieldErrors(err);
      if (Object.keys(serverErrors).length > 0) {
        setFieldErrors(serverErrors);
        setError('Please correct the errors below.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to resubmit. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <AuthHeader
        title="Edit & Resubmit"
        actionLabel="Cancel"
        onAction={onCancel}
        actionDisabled={isSubmitting}
      />

      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionLabel}>Account Details</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>First Name</Text>
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
          <View style={[styles.fieldGroup, styles.flex3]}>
            <Text style={styles.label}>Last Name</Text>
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
              placeholder="Jr."
              autoCapitalize="words"
            />
            {fieldErrors.suffix ? <Text style={styles.fieldError}>{fieldErrors.suffix[0]}</Text> : null}
          </View>
        </FormRow>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <KeyboardAwareTextInput
            style={[styles.input, fieldErrors.email ? styles.inputError : null]}
            value={state.email}
            onChangeText={(v) => setField('email', v)}
            placeholder="Email Address"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {fieldErrors.email ? <Text style={styles.fieldError}>{fieldErrors.email[0]}</Text> : null}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Username</Text>
          <KeyboardAwareTextInput
            style={[styles.input, fieldErrors.username ? styles.inputError : null]}
            value={state.username}
            onChangeText={(v) => setField('username', v)}
            placeholder="Username"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {fieldErrors.username ? <Text style={styles.fieldError}>{fieldErrors.username[0]}</Text> : null}
        </View>

        <SchoolPicker
          value={state.schoolId}
          onChange={(id) => setField('schoolId', id)}
          error={fieldErrors.school_id?.[0]}
        />

        <View style={styles.row}>
          <View style={[styles.fieldGroup, styles.flex1]}>
            <Text style={styles.label}>Graduation Year</Text>
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
            <Text style={styles.label}>Section / Strand</Text>
            <KeyboardAwareTextInput
              style={[styles.input, fieldErrors.section_strand ? styles.inputError : null]}
              value={state.sectionStrand}
              onChangeText={(v) => setField('sectionStrand', v)}
              placeholder="e.g. STEM A"
            />
            {fieldErrors.section_strand ? (
              <Text style={styles.fieldError}>{fieldErrors.section_strand[0]}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.fieldGroup, styles.flex1]}>
            <Text style={styles.label}>Gender</Text>
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
            {fieldErrors.gender ? <Text style={styles.fieldError}>{fieldErrors.gender[0]}</Text> : null}
          </View>
          <View style={styles.flex1}>
            <DateField
              label="Birthdate"
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
          />
          {fieldErrors.address ? <Text style={styles.fieldError}>{fieldErrors.address[0]}</Text> : null}
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
            />
            {fieldErrors.student_id ? <Text style={styles.fieldError}>{fieldErrors.student_id[0]}</Text> : null}
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

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Employment Status</Text>
          <View style={styles.pickerContainer}>
            <Picker
              style={styles.picker}
              selectedValue={state.employmentStatus}
              onValueChange={(value) => {
                const employmentStatus = EMPLOYMENT_STATUS_OPTIONS.find((option) => option.value === String(value))?.value ?? '';
                setField('employmentStatus', employmentStatus);
                if (employmentStatus !== 'employed' && employmentStatus !== 'self_employed') {
                  setField('companyName', '');
                  setField('positionInCompany', '');
                }
              }}
              accessibilityLabel="Employment Status"
            >
              <Picker.Item label="Select employment status" value="" />
              {EMPLOYMENT_STATUS_OPTIONS.map(({ value, label }) => <Picker.Item key={value} label={label} value={value} />)}
            </Picker>
          </View>
          {fieldErrors.employment_status ? <Text style={styles.fieldError}>{fieldErrors.employment_status[0]}</Text> : null}
        </View>

        {(state.employmentStatus === 'employed' || state.employmentStatus === 'self_employed') ? (
          <FormRow stackWhenNarrow>
            <View style={[styles.fieldGroup, styles.flex1]}>
              <Text style={styles.label}>Company Name *</Text>
              <KeyboardAwareTextInput
                style={[styles.input, fieldErrors.company_name ? styles.inputError : null]}
                value={state.companyName}
                onChangeText={(value) => setField('companyName', value)}
                placeholder="Company Name"
                autoCapitalize="words"
              />
              {fieldErrors.company_name ? <Text style={styles.fieldError}>{fieldErrors.company_name[0]}</Text> : null}
            </View>
            <View style={[styles.fieldGroup, styles.flex1]}>
              <Text style={styles.label}>Position In Company *</Text>
              <KeyboardAwareTextInput
                style={[styles.input, fieldErrors.position_in_company ? styles.inputError : null]}
                value={state.positionInCompany}
                onChangeText={(value) => setField('positionInCompany', value)}
                placeholder="Position In Company"
                autoCapitalize="words"
              />
              {fieldErrors.position_in_company ? <Text style={styles.fieldError}>{fieldErrors.position_in_company[0]}</Text> : null}
            </View>
          </FormRow>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.buttonRow}>
          <Pressable
            style={styles.cancelButton}
            onPress={onCancel}
            disabled={isSubmitting}
            android_ripple={ripple.onLight}
            accessibilityRole="button"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            android_ripple={ripple.onDark}
            accessibilityRole="button"
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Text style={styles.submitButtonText}>Resubmit for Review</Text>
            )}
          </Pressable>
        </View>
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
    flex: 2,
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
  flex1: {
    flex: 1,
  },
  flex3: {
    flex: 3,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  cancelButtonText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
});

export default ResubmitScreen;
