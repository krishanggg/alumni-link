import { useState } from 'react';
import {
  View, Text, Pressable,
  StyleSheet, ActivityIndicator,
} from 'react-native';

import Icon from '../../components/shared/Icon';
import ErrorAlert from '../../components/shared/ErrorAlert';
import {
  KeyboardAwareScrollView,
  KeyboardAwareTextInput,
} from '../../components/shared/KeyboardAwareScrollView';
import * as settingsService from '../../services/settingsService';
import { toFieldErrors } from '../../services/api';
import { PASSWORD_RULES } from '../../utils/passwordRules';

import {
  colors, extendedColors, layout, presets, radius, ripple, spacing, typography,
} from '../../theme';

function SecuritySettingsScreen() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const passwordChecks = PASSWORD_RULES.map((rule) => ({
    ...rule,
    satisfied: rule.test(newPassword),
  }));

  const passwordValid = passwordChecks.every((c) => c.satisfied);
  const passwordsMatch = newPassword === newPasswordConfirmation && newPassword.length > 0;

  const satisfiedCount = passwordChecks.filter((c) => c.satisfied).length;
  const passwordStrength = satisfiedCount >= 5
    ? { label: 'Strong', color: colors.onSuccessContainer }
    : satisfiedCount >= 3
      ? { label: 'Fair', color: colors.onWarningContainer }
      : { label: 'Weak', color: colors.error };

  async function handleChangePassword() {
    setIsSaving(true);
    setFieldErrors({});
    setGeneralError(null);
    setSuccessMessage(null);

    if (!passwordValid) {
      setGeneralError('Please meet all password requirements.');
      setIsSaving(false);
      return;
    }

    if (!passwordsMatch) {
      setGeneralError('Passwords do not match.');
      setIsSaving(false);
      return;
    }

    try {
      await settingsService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: newPasswordConfirmation,
      });
      setSuccessMessage('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirmation('');
    } catch (error) {
      const errors = toFieldErrors(error);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
      } else {
        setGeneralError(
          error instanceof Error ? error.message : 'Could not change password. Please try again.',
        );
      }
    } finally {
      setIsSaving(false);
    }
  }

  function renderFieldError(field: string): React.JSX.Element | null {
    const messages = fieldErrors[field];
    if (!messages || messages.length === 0) return null;
    return <Text style={styles.fieldError}>{messages[0]}</Text>;
  }

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.sectionTitle}>Change Password</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Current Password</Text>
        <KeyboardAwareTextInput
          style={[
            styles.input,
            fieldErrors.current_password ? styles.inputError : null,
          ]}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Enter current password"
          placeholderTextColor={colors.outline}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        {renderFieldError('current_password')}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>New Password</Text>
        <KeyboardAwareTextInput
          style={[
            styles.input,
            fieldErrors.new_password ? styles.inputError : null,
          ]}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Enter new password"
          placeholderTextColor={colors.outline}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        {renderFieldError('new_password')}
      </View>

      {/* Sits directly under the field that drives it — further down the form
          it would sit behind the keyboard while the user types. */}
      {newPassword.length > 0 && (
        <View style={styles.strengthBar}>
          <View style={styles.strengthLabelRow}>
            <Text style={styles.strengthLabel}>Password strength:</Text>
            <Text style={styles.strengthValue}>{passwordStrength.label}</Text>
          </View>
          <View style={styles.strengthTrack}>
            <View
              style={[
                styles.strengthFill,
                {
                  width: `${(satisfiedCount / PASSWORD_RULES.length) * 100}%`,
                  backgroundColor: passwordStrength.color,
                },
              ]}
            />
          </View>
        </View>
      )}

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Confirm New Password</Text>
        <KeyboardAwareTextInput
          style={[
            styles.input,
            fieldErrors.new_password_confirmation ? styles.inputError : null,
            newPasswordConfirmation.length > 0 && !passwordsMatch ? styles.inputError : null,
          ]}
          value={newPasswordConfirmation}
          onChangeText={setNewPasswordConfirmation}
          placeholder="Confirm new password"
          placeholderTextColor={colors.outline}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        {renderFieldError('new_password_confirmation')}
        {newPasswordConfirmation.length > 0 && !passwordsMatch ? (
          <Text style={styles.fieldError}>Passwords do not match.</Text>
        ) : null}
      </View>

      <View style={styles.rulesCard}>
        <Text style={styles.rulesTitle}>Password Requirements</Text>
        {passwordChecks.map((check) => (
          <View key={check.label} style={styles.ruleRow}>
            {/* Decorative — the row's met/unmet styling and label text already
                convey the state; the icon adds nothing for a screen reader. */}
            <Icon
              name={check.satisfied ? 'check' : 'close'}
              size={16}
              color={check.satisfied ? colors.onSuccessContainer : colors.outline}
            />
            <Text
              style={[
                styles.ruleLabel,
                check.satisfied ? styles.ruleLabelSatisfied : styles.ruleLabelUnsatisfied,
              ]}
            >
              {check.label}
            </Text>
          </View>
        ))}
      </View>

      {successMessage ? (
        <View style={styles.successAlert}>
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      ) : null}

      {generalError ? <ErrorAlert message={generalError} style={styles.alert} /> : null}

      <Pressable
        style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
        onPress={handleChangePassword}
        disabled={isSaving}
        android_ripple={ripple.onDark}
        accessibilityRole="button"
        accessibilityLabel={isSaving ? 'Changing password' : 'Change password'}
        accessibilityState={{ disabled: isSaving, busy: isSaving }}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color={colors.onPrimary} />
        ) : (
          <Text style={styles.saveButtonText}>Change Password</Text>
        )}
      </Pressable>

      <View style={styles.bottomSpacer} />
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  contentContainer: {
    padding: layout.cardGap,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    marginBottom: layout.cardGap,
  },
  fieldGroup: {
    marginBottom: layout.cardGap,
  },
  label: {
    ...presets.fieldLabel,
    color: colors.onSurface,
  },
  input: {
    ...presets.input,
  },
  inputError: {
    ...presets.inputRowError,
  },
  fieldError: {
    ...presets.fieldError,
    marginLeft: 0,
  },
  rulesCard: {
    ...presets.card,
    borderRadius: radius.md,
    padding: layout.cardGap,
    marginBottom: layout.cardGap,
  },
  rulesTitle: {
    ...typography.labelMd,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 6,
  },
  ruleLabel: {
    ...typography.labelSm,
  },
  ruleLabelSatisfied: {
    color: colors.onSuccessContainer,
  },
  ruleLabelUnsatisfied: {
    color: colors.onSurfaceVariant,
  },
  strengthBar: {
    marginBottom: layout.cardGap,
    gap: 6,
  },
  strengthLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  strengthLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  strengthValue: {
    ...typography.labelSm,
    fontWeight: '600',
    color: colors.onSurface,
  },
  strengthTrack: {
    height: 6,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 3,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 3,
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
  // Kept navy to match presets.primaryButton and LoginScreen — one primary
  // button treatment across the app.
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

export default SecuritySettingsScreen;
