import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

import { colors, presets, ripple, spacing, typography } from '../../theme';

function NonAlumniScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>AlumniLink</Text>
        <Text style={styles.heading}>Mobile App — Alumni Only</Text>
        <Text style={styles.description}>
          The AlumniLink mobile app is for approved alumni only.
        </Text>
        <Text style={styles.description}>
          Administrators should use the AlumniLink web portal to manage
          schools, users, alumni records, and reports.
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

export default NonAlumniScreen;
