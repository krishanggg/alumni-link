import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

import { colors, presets, ripple, spacing, typography } from '../../theme';

// Shown when an account is deactivated or its linked alumni record is archived.
function ArchivedAccountScreen() {
  const { user, logout } = useAuth();
  const isArchived = user?.alumni_archived === true;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>AlumniLink</Text>
        <Text style={styles.heading}>Account Inactive</Text>
        <Text style={styles.description}>
          {isArchived
            ? 'Your alumni record has been archived and your account is no longer active.'
            : 'Your account has been deactivated by an administrator.'}
        </Text>
        <Text style={styles.description}>
          {isArchived
            ? 'Please contact your school administrator if you believe this is a mistake or would like your record restored.'
            : 'Please contact your school administrator if you believe this is a mistake.'}
        </Text>

        {user?.name ? (
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>
        ) : null}

        <Pressable
          style={styles.logoutButton}
          onPress={logout}
          android_ripple={ripple.onLight}
          accessibilityRole="button"
          accessibilityLabel="Log out"
        >
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </Pressable>
      </View>

      <Text style={styles.version}>Alumni Tracking System v1.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...presets.centeredScreen,
  },
  card: {
    ...presets.authCard,
  },
  title: {
    ...typography.headlineLg,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 24,
  },
  heading: {
    ...typography.headlineSm,
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 8,
  },
  userInfo: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  userName: {
    ...typography.labelMd,
    color: colors.onSurface,
  },
  userEmail: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  logoutButton: {
    ...presets.secondaryButton,
    marginTop: spacing.sm,
  },
  logoutButtonText: {
    ...typography.labelMd,
    color: colors.error,
  },
  version: {
    ...typography.bodySm,
    color: colors.outline,
    marginTop: 24,
  },
});

export default ArchivedAccountScreen;
