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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { EmploymentStatus, RegisterPayload } from '../../types';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

import FormRow from '../../components/shared/FormRow';
import AuthHeader from '../../components/shared/AuthHeader';
import Icon from '../../components/shared/Icon';
import { FormSectionHeader } from '../../components/shared/FormSectionHeader';
import {
  KeyboardAwareScrollView,
  KeyboardAwareTextInput,
} from '../../components/shared/KeyboardAwareScrollView';
import { SchoolPicker } from '../../components/registration/SchoolPicker';
import { DateField, toDateString } from '../../components/shared/DateField';
import { getLatestBirthdate } from '../../utils/birthdate';
import * as authService from '../../services/authService';
import { toFieldErrors } from '../../services/api';
import { unmetPasswordRules } from '../../utils/passwordRules';
import { EMPLOYMENT_STATUS_OPTIONS } from '../../constants/employmentStatus';

import {
  colors, extendedColors, layout, presets, radius, ripple, spacing, typography,
} from '../../theme';

interface RegisterFormState {
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
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


const INITIAL_STATE: RegisterFormState = {
  firstName: '',
  middleName: '',
  lastName: '',
  suffix: '',
  email: '',
  username: '',
  password: '',
  confirmPassword: '',
  schoolId: null,
  graduationYear: '',
  sectionStrand: '',
  gender: '',
  birthdate: '',
  address: '',
  studentId: '',
  contactNumber: '',
  employmentStatus: '',
  companyName: '',
  positionInCompany: '',
};

function blankToUndefined(value: string): string | undefined {
  return value.trim() ? value.trim() : undefined;
}

function buildPayload(state: RegisterFormState): RegisterPayload {
  return {
    first_name: state.firstName.trim(),
    middle_name: blankToUndefined(state.middleName),
    last_name: state.lastName.trim(),
    suffix: blankToUndefined(state.suffix),
    email: state.email.trim(),
    username: state.username.trim(),
    password: state.password,
    password_confirmation: state.confirmPassword,
    school_id: state.schoolId as number,
    graduation_year: parseInt(state.graduationYear, 10),
    section_strand: state.sectionStrand.trim(),
    gender: state.gender as 'male' | 'female',
    birthdate: state.birthdate.trim(),
    address: blankToUndefined(state.address),
    student_id: blankToUndefined(state.studentId),
    contact_number: blankToUndefined(state.contactNumber),
    employment_status: state.employmentStatus || null,
    company_name: blankToUndefined(state.companyName),
    position_in_company: blankToUndefined(state.positionInCompany),
  };
}

function RegisterScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  const [state, setState] = useState<RegisterFormState>(INITIAL_STATE);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  // Only the still-unmet rules are surfaced, matching web's RegisterPage.
  const unmetRules = unmetPasswordRules(state.password);

  function setField<K extends keyof RegisterFormState>(field: K, value: RegisterFormState[K]) {
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
    if (!state.email.trim()) {
      errors.email = ['Please enter your email address.'];
    } else if (!/\S+@\S+\.\S+/.test(state.email)) {
      errors.email = ['Please enter a valid email address.'];
    }
    if (!state.username.trim()) {
      errors.username = ['Please choose a username.'];
    } else if (!/^[a-zA-Z0-9_]+$/.test(state.username)) {
      errors.username = ['Username may only contain letters, numbers, and underscores.'];
    }

    const unmet = unmetPasswordRules(state.password);
    if (!state.password) {
      errors.password = ['Please choose a password.'];
    } else if (unmet.length > 0) {
      errors.password = unmet.map((rule) => rule.message);
    } else if (state.password !== state.confirmPassword) {
      errors.password = ['Passwords do not match.'];
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
    if (!state.address.trim()) {
      errors.address = ['Please enter your address.'];
    }
    if (!state.contactNumber.trim()) {
      errors.contact_number = ['Please enter your contact number.'];
    } else if (!/^(09\d{9}|\+639\d{9})$/.test(state.contactNumber.trim())) {
      errors.contact_number = ['Please enter a valid Philippine mobile number (e.g. 09123456789).'];
    }
    if (!state.employmentStatus) {
      errors.employment_status = ['Please select your employment status.'];
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

    if (!validate()) {
      setError('Please correct the errors below.');
      return;
    }

    setIsSubmitting(true);

    try {
      await authService.register(buildPayload(state));
      setIsSuccess(true);
    } catch (err) {
      const serverErrors = toFieldErrors(err);
      if (Object.keys(serverErrors).length > 0) {
        setFieldErrors(serverErrors);
        setError('Please correct the errors below.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to register. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSuccess) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successTitle}>Registration Submitted</Text>
        <Text style={styles.successBody}>
          Your registration has been submitted and is pending admin approval. You&apos;ll be able to log
          in once your account is approved.
        </Text>
        <Pressable
          style={styles.submitButton}
          onPress={() => navigation.navigate('Login')}
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
        title="Create Account"
        actionLabel="Cancel"
        onAction={() => navigation.goBack()}
        actionDisabled={isSubmitting}
      />

      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <FormSectionHeader icon="profile" label="Account Information" tint={colors.surfaceContainer} />

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
            <View style={[styles.fieldGroup, styles.flex3]}>
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

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email *</Text>
            <KeyboardAwareTextInput
              style={[styles.input, fieldErrors.email ? styles.inputError : null]}
              value={state.email}
              onChangeText={(v) => setField('email', v)}
              placeholder="Email Address"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={Platform.OS === 'web' ? 'off' : 'email'}
              textContentType={Platform.OS === 'web' ? 'none' : 'emailAddress'}
            />
            {fieldErrors.email ? <Text style={styles.fieldError}>{fieldErrors.email[0]}</Text> : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Username *</Text>
            <KeyboardAwareTextInput
              style={[styles.input, fieldErrors.username ? styles.inputError : null]}
              value={state.username}
              onChangeText={(v) => setField('username', v)}
              placeholder="Username"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={Platform.OS === 'web' ? 'off' : 'username'}
              textContentType={Platform.OS === 'web' ? 'none' : 'username'}
            />
            {fieldErrors.username ? (
              <Text style={styles.fieldError}>{fieldErrors.username[0]}</Text>
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password *</Text>
            <View style={styles.passwordFieldWrapper}>
              <KeyboardAwareTextInput
                style={[styles.input, styles.passwordInput, fieldErrors.password ? styles.inputError : null]}
                value={state.password}
                onChangeText={(v) => setField('password', v)}
                placeholder="Password"
                secureTextEntry={!isPasswordVisible}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
              />
              <Pressable
                style={styles.passwordVisibilityButton}
                onPress={() => setIsPasswordVisible((visible) => !visible)}
                android_ripple={ripple.onLight}
                accessibilityRole="button"
                accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
              >
                <Icon
                  name={isPasswordVisible ? 'hidePassword' : 'showPassword'}
                  size={18}
                  color={colors.outline}
                />
              </Pressable>
            </View>
            {state.password.length > 0 && unmetRules.length > 0 ? (
              <View style={styles.ruleList}>
                {unmetRules.map((rule) => (
                  <View key={rule.label} style={styles.ruleRow}>
                    <Icon name="close" size={13} color={colors.outline} />
                    <Text style={styles.ruleText}>{rule.label}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {fieldErrors.password
              ? fieldErrors.password.map((message) => (
                  <Text key={message} style={styles.fieldError}>
                    {message}
                  </Text>
                ))
              : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm Password *</Text>
            <View style={styles.passwordFieldWrapper}>
              <KeyboardAwareTextInput
                style={[styles.input, styles.passwordInput]}
                value={state.confirmPassword}
                onChangeText={(v) => setField('confirmPassword', v)}
                placeholder="Re-enter Password"
                secureTextEntry={!isConfirmPasswordVisible}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
              />
              <Pressable
                style={styles.passwordVisibilityButton}
                onPress={() => setIsConfirmPasswordVisible((visible) => !visible)}
                android_ripple={ripple.onLight}
                accessibilityRole="button"
                accessibilityLabel={isConfirmPasswordVisible ? 'Hide password' : 'Show password'}
              >
                <Icon
                  name={isConfirmPasswordVisible ? 'hidePassword' : 'showPassword'}
                  size={18}
                  color={colors.outline}
                />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <FormSectionHeader
            icon="identity"
            label="Personal Information"
            tint={extendedColors.categoricalViolet}
          />

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
            <Text style={styles.label}>Address *</Text>
            <KeyboardAwareTextInput
              style={[styles.input, styles.textArea, fieldErrors.address ? styles.inputError : null]}
              value={state.address}
              onChangeText={(v) => setField('address', v)}
              placeholder="Your address"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            {fieldErrors.address ? (
              <Text style={styles.fieldError}>{fieldErrors.address[0]}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <FormSectionHeader icon="graduationCap" label="Alumni Information" tint={colors.infoContainer} />

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
              />
              {fieldErrors.section_strand ? (
                <Text style={styles.fieldError}>{fieldErrors.section_strand[0]}</Text>
              ) : null}
            </View>
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
              {fieldErrors.student_id ? (
                <Text style={styles.fieldError}>{fieldErrors.student_id[0]}</Text>
              ) : null}
            </View>
            <View style={[styles.fieldGroup, styles.flex1]}>
              <Text style={styles.label}>Contact Number *</Text>
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
            <Text style={styles.label}>Employment Status *</Text>
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
        </View>

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
          accessibilityLabel={isSubmitting ? 'Registering' : 'Register'}
          accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Text style={styles.submitButtonText}>Register</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.loginLink}
          onPress={() => navigation.navigate('Login')}
          disabled={isSubmitting}
          android_ripple={ripple.onLight}
          accessibilityRole="button"
          accessibilityLabel="Already have an account? Log in"
        >
          <Text style={styles.loginLinkText}>Already have an account? Log In</Text>
        </Pressable>
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  /**
   * One card per field group. The bottom padding is 0 on purpose: every group's
   * last child is a field with `fieldGroup`'s 16pt bottom margin, which supplies
   * the inset. Adding padding under it would double the gap.
   */
  section: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    padding: spacing.lg,
    paddingBottom: 0,
    marginBottom: layout.cardGap,
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
  passwordFieldWrapper: {
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: layout.minTouchTarget,
  },
  passwordVisibilityButton: {
    position: 'absolute',
    right: 0,
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
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
    padding: spacing.lg,
    paddingBottom: 40,
  },
  ruleList: {
    marginTop: 6,
    marginLeft: 4,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  ruleText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    flex: 1,
    minWidth: 0,
  },
  flex1: {
    flex: 1,
  },
  flex3: {
    flex: 3,
  },
  loginLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  loginLinkText: {
    ...typography.labelMd,
    color: colors.accent,
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

export default RegisterScreen;
