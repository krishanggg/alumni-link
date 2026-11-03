import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { AuthStackParamList } from '../../navigation/AuthNavigator';

import Icon from '../../components/shared/Icon';
import {
  KeyboardAwareScrollView,
  KeyboardAwareTextInput,
} from '../../components/shared/KeyboardAwareScrollView';
import * as authService from '../../services/authService';

import { colors, layout, presets, ripple, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  function validate(): boolean {
    if (!email.trim()) {
      setEmailError('Email address is required.');
      return false;
    }
    setEmailError('');
    return true;
  }

  async function handleSubmit() {
    if (!validate()) return;

    setIsLoading(true);
    try {
      await authService.forgotPassword(email.trim());
    } catch {
      // Silently succeed for security
    }
    setIsSubmitted(true);
    setIsLoading(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* `LoginScreen` sets `style="light"` for its navy hero and stays mounted
          beneath this screen when it is pushed, so its light status bar would
          win over this screen's near-white background and render the clock
          illegible. A screen pushed above a dark-hero screen has to restate its
          own status bar; the branch default in `AppNavigator` is not enough. */}
      <StatusBar style="dark" />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {/* The chevron is decorative — "Back" beside it is the announcement. */}
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            android_ripple={ripple.onLight}
            accessibilityRole="button"
            accessibilityLabel="Back to login"
          >
            <Icon name="back" size={16} color={colors.primary} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <Text style={styles.title}>Forgot Password</Text>

          {isSubmitted ? (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>
                If an account with that email exists, a password reset link has been sent.
              </Text>
              <Pressable
                style={styles.backToLoginButton}
                onPress={() => navigation.goBack()}
                android_ripple={ripple.onLight}
                accessibilityRole="button"
              >
                <Text style={styles.backToLoginText}>Back to Login</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.description}>
                Enter your email address and we'll send you a link to reset your password.
              </Text>
              <View style={styles.fieldGroup}>
                <KeyboardAwareTextInput
                  style={[styles.input, emailError ? styles.inputError : null]}
                  placeholder="Email Address"
                  value={email}
                  onChangeText={(text) => { setEmail(text); setEmailError(''); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="emailAddress"
                />
                {emailError ? (
                  <Text style={styles.fieldError}>{emailError}</Text>
                ) : null}
              </View>
              <Pressable
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={isLoading}
                android_ripple={ripple.onDark}
                accessibilityRole="button"
              >
                <Text style={styles.buttonText}>
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: layout.cardGap,
  },
  card: {
    ...presets.authCard,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    marginBottom: layout.cardGap,
  },
  backText: {
    ...typography.labelMd,
    color: colors.primary,
  },
  title: {
    ...typography.displayMd,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  input: {
    ...presets.input,
  },
  inputError: {
    ...presets.inputRowError,
  },
  fieldError: {
    ...presets.fieldError,
  },
  button: {
    ...presets.primaryButton,
  },
  buttonDisabled: {
    ...presets.buttonDisabled,
  },
  buttonText: {
    ...presets.primaryButtonText,
  },
  successContainer: {
    alignItems: 'center',
  },
  successText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 20,
  },
  backToLoginButton: {
    padding: 12,
  },
  backToLoginText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '600',
  },
});

export default ForgotPasswordScreen;
