import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, { Ellipse } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { AuthStackParamList } from '../../navigation/AuthNavigator';

import Icon from '../../components/shared/Icon';
import {
  KeyboardAwareScrollView,
  KeyboardAwareTextInput,
} from '../../components/shared/KeyboardAwareScrollView';
import SchoolSeal from '../../components/shared/icons/SchoolSeal';
import { useAuth } from '../../contexts/AuthContext';
import { toFieldErrors } from '../../services/api';
import {
  getLoginControlHeight,
  getLoginLayoutScale,
  scaleLoginLayout,
} from './loginLayout';

import { colors, extendedColors, layout, ripple, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const { height: viewportHeight } = useWindowDimensions();
  const layoutScale = getLoginLayoutScale(viewportHeight);
  const controlHeight = getLoginControlHeight(layoutScale);
  const arcHeight = scaleLoginLayout(32, layoutScale);
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(false);

  function validate(): boolean {
    const errors: Record<string, string[]> = {};

    if (!credential.trim()) {
      errors.login = ['Email or username is required.'];
    }
    if (!password) {
      errors.password = ['Password is required.'];
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleLogin() {
    setError('');
    setFieldErrors({});

    if (!validate()) return;

    setIsLoading(true);

    try {
      await login({ login: credential.trim(), password });
    } catch (err) {
      const serverErrors = toFieldErrors(err);
      if (Object.keys(serverErrors).length > 0) {
        setFieldErrors(serverErrors);
      } else {
        setError(err instanceof Error ? err.message : 'Login failed');
      }
    } finally {
      setIsLoading(false);
    }
  }

  const credentialError = fieldErrors.login ?? fieldErrors.email;
  const passwordError = fieldErrors.password;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* The navy hero runs under the system status bar, so this screen overrides
          the dark status-bar content that the rest of the auth stack uses. */}
      <StatusBar style="light" />
      <KeyboardAwareScrollView
        focusedFieldGap={scaleLoginLayout(24, layoutScale)}
        // The footer otherwise renders underneath the Android gesture/nav bar.
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + scaleLoginLayout(24, layoutScale) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.hero,
            {
              paddingTop: scaleLoginLayout(72, layoutScale),
              paddingBottom: scaleLoginLayout(48, layoutScale),
            },
          ]}
        >
          <View
            style={[
              styles.seal,
              {
                width: scaleLoginLayout(96, layoutScale),
                height: scaleLoginLayout(96, layoutScale),
                marginBottom: scaleLoginLayout(20, layoutScale),
              },
            ]}
          >
            <SchoolSeal size={scaleLoginLayout(62, layoutScale)} color={colors.primary} />
          </View>

          <Text style={styles.brand}>AlumniLink</Text>
          <Text style={styles.brandSubtitle}>Alumni Tracking System</Text>
          <Text style={styles.brandTertiary}>National High Schools</Text>

          {/* A real ellipse gives a single smooth bottom arc; corner radii on a
              rectangle would leave a flat middle. */}
          <Svg
            style={[styles.heroArc, { bottom: -arcHeight }]}
            width="100%"
            height={arcHeight}
            viewBox="0 0 100 32"
            preserveAspectRatio="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Ellipse cx="50" cy="0" rx="50" ry="32" fill={colors.primary} />
          </Svg>
        </View>

        <View style={[styles.body, { paddingTop: scaleLoginLayout(64, layoutScale) }]}>
          <Text style={styles.welcome}>Welcome Back!</Text>
          <Text
            style={[
              styles.welcomeSubtitle,
              { marginBottom: scaleLoginLayout(24, layoutScale) },
            ]}
          >
            Please log in to continue
          </Text>

          <View style={{ marginBottom: scaleLoginLayout(14, layoutScale) }}>
            <View style={[
              styles.inputRow,
              { height: controlHeight },
              credentialError ? styles.inputRowError : null,
            ]}>
              <Icon name="email" size={18} color={colors.outline} />
              <KeyboardAwareTextInput
                style={styles.input}
                placeholder="Email or Username"
                placeholderTextColor={colors.outline}
                value={credential}
                onChangeText={setCredential}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete={Platform.OS === 'web' ? 'off' : 'username'}
                keyboardType="email-address"
                textContentType={Platform.OS === 'web' ? 'none' : 'emailAddress'}
              />
            </View>
            {credentialError ? (
              <Text style={styles.fieldError}>{credentialError[0]}</Text>
            ) : null}
          </View>

          <View>
            <View style={[
              styles.inputRow,
              { height: controlHeight },
              passwordError ? styles.inputRowError : null,
            ]}>
              <Icon name="password" size={18} color={colors.outline} />
              <KeyboardAwareTextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.outline}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!isPasswordVisible}
                autoComplete={Platform.OS === 'web' ? 'off' : 'current-password'}
                textContentType={Platform.OS === 'web' ? 'none' : 'password'}
              />
              <Pressable
                style={styles.passwordVisibilityButton}
                onPress={() => setIsPasswordVisible((visible) => !visible)}
                android_ripple={ripple.onLight}
                accessibilityRole="button"
                accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
              >
                {/* The touchable already carries the label, so the glyph stays
                    decorative and is not announced twice. */}
                <Icon
                  name={isPasswordVisible ? 'hidePassword' : 'showPassword'}
                  size={18}
                  color={colors.outline}
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.metaRow}>
            {passwordError ? (
              <Text style={[styles.fieldError, styles.passwordMetaError]}>
                {passwordError[0]}
              </Text>
            ) : null}
            <Pressable
              style={styles.forgotButton}
              onPress={() => navigation.navigate('ForgotPassword')}
              android_ripple={ripple.onLight}
              accessibilityRole="button"
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </Pressable>
          </View>

          {error ? (
            <View style={[styles.errorAlert, { marginBottom: scaleLoginLayout(16, layoutScale) }]}>
              <Text style={styles.errorAlertText}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            style={[
              styles.loginButton,
              { height: controlHeight },
              isLoading && styles.loginButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={isLoading}
            android_ripple={ripple.onDark}
            accessibilityRole="button"
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? 'Logging in...' : 'Log In'}
            </Text>
          </Pressable>

          <View
            style={[styles.dividerRow, { marginVertical: scaleLoginLayout(20, layoutScale) }]}
          >
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* The reference design puts "Browse as Guest" here. Guest browsing has
              no backend surface and would widen directory access beyond approved
              alumni, so this slot carries Registration — the real, spec'd second
              path off this screen — in the same outlined treatment. */}
          <Pressable
            style={[styles.secondaryButton, { height: controlHeight }]}
            onPress={() => navigation.navigate('Register')}
            android_ripple={ripple.onLight}
            accessibilityRole="button"
          >
            <Icon name="edit" size={16} color={colors.primary} />
            <Text style={styles.secondaryButtonText}>Create an Account</Text>
          </Pressable>

          <Text style={[styles.footer, { marginTop: scaleLoginLayout(32, layoutScale) }]}>
            {'©'} {new Date().getFullYear()} National High Schools
          </Text>
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
  },
  hero: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
  },
  heroArc: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  seal: {
    borderRadius: 999,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 3,
    borderColor: colors.primaryFixedDim,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brand: {
    ...typography.displayLg,
    color: colors.onPrimary,
    letterSpacing: 0.3,
  },
  brandSubtitle: {
    ...typography.labelSm,
    color: colors.onPrimary,
    marginTop: 6,
  },
  brandTertiary: {
    ...typography.bodySm,
    color: colors.primaryFixedDim,
    marginTop: 4,
  },
  body: {
    paddingHorizontal: 24,
  },
  welcome: {
    ...typography.headlineLg,
    color: colors.onSurface,
  },
  welcomeSubtitle: {
    ...typography.bodySm,
    color: colors.outline,
    marginTop: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  inputRowError: {
    borderColor: colors.error,
  },
  input: {
    ...typography.bodySm,
    flex: 1,
    minWidth: 0,
    color: colors.onSurface,
    // Strips the default vertical padding so text stays centred as the
    // responsive control row changes height.
    paddingVertical: 0,
    // Stretched to the row's height so the box KeyboardAwareScrollView measures
    // is the box that is painted. Without this, the input hugs its 19 dp text
    // line instead of the row's full height, and the scroll-into-view lift
    // leaves the row's lower border sitting under the keyboard.
    // `textAlignVertical` keeps the text centred in the taller box on Android.
    alignSelf: 'stretch',
    textAlignVertical: 'center',
  },
  passwordVisibilityButton: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    marginRight: -14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldError: {
    ...typography.labelSm,
    color: colors.error,
    marginTop: 4,
    marginLeft: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordMetaError: {
    flexShrink: 1,
    marginTop: 0,
    marginRight: spacing.sm,
  },
  forgotButton: {
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  forgotText: {
    ...typography.labelMd,
    color: colors.accent,
  },
  errorAlert: {
    backgroundColor: colors.errorContainer,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: extendedColors.errorContainerBorder,
    padding: 12,
  },
  errorAlertText: {
    ...typography.labelSm,
    color: colors.onErrorContainer,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    ...typography.titleMd,
    color: colors.onPrimary,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.surfaceContainerHighest,
  },
  dividerLabel: {
    ...typography.labelMd,
    color: colors.outline,
  },
  secondaryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 10,
  },
  secondaryButtonText: {
    ...typography.labelMd,
    color: colors.primary,
  },
  footer: {
    ...typography.bodySm,
    color: colors.outline,
    textAlign: 'center',
  },
});

export default LoginScreen;
