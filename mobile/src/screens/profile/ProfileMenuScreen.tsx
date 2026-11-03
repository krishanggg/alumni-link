import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../../contexts/AuthContext';
import Icon, { type IconName } from '../../components/shared/Icon';
import { resolveStorageUrl } from '../../services/api';
import type { ProfileStackParamList } from '../../navigation/ProfileNavigator';

import { colors, ripple, typography } from '../../theme';

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList>;

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function MenuItem({
  icon,
  label,
  description,
  onPress,
}: {
  icon: IconName;
  label: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={styles.menuItem}
      onPress={onPress}
      android_ripple={ripple.onLight}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${description}`}
    >
      {/* Both glyphs are decorative — the row's label names the destination and the
          chevron only signals that the row navigates. `Icon` hides them by default. */}
      <Icon name={icon} size={20} color={colors.onSurfaceVariant} />
      <View style={styles.menuContent}>
        <Text style={styles.menuLabel}>{label}</Text>
        <Text style={styles.menuDescription}>{description}</Text>
      </View>
      <Icon name="chevronRight" size={18} color={colors.outline} />
    </Pressable>
  );
}

function ProfileMenuScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  const photoUrl = resolveStorageUrl(user?.photo_url ?? null);

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        {user ? (
          <View style={styles.userCard}>
            {/* `/auth/me` already falls back to the linked alumni photo, so this always
                matches the dashboard avatar without a second request. */}
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>{initialsOf(user.name)}</Text>
              </View>
            )}
            <View style={styles.userInfo}>
              {/* Two lines, not one — at 320 dp a full name truncates to "Donato Treva
                  Lindg…" on a single line. The email stays single-line: it's the less
                  important of the two, and an ellipsised address still reads as one. */}
              <Text style={styles.userName} numberOfLines={2}>{user.name}</Text>
              <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
              {user.school ? (
                <Text style={styles.userSchool} numberOfLines={2}>{user.school.name}</Text>
              ) : null}
            </View>
          </View>
        ) : null}

        <MenuItem
          icon="profile"
          label="Edit Profile"
          description="Update your name, email, and alumni record details"
          onPress={() => navigation.navigate('ProfileSettings')}
        />
        <MenuItem
          icon="security"
          label="Security"
          description="Change your password"
          onPress={() => navigation.navigate('SecuritySettings')}
        />
        <MenuItem
          icon="notifications"
          label="Notifications"
          description="Manage email notification preferences"
          onPress={() => navigation.navigate('NotificationSettings')}
        />
      </View>

      <Pressable
        style={styles.logoutButton}
        onPress={logout}
        android_ripple={ripple.onLight}
        accessibilityRole="button"
        accessibilityLabel="Log out"
      >
        <Text style={styles.logoutText}>Log Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 16,
  },
  section: {
    gap: 8,
  },
  userCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    backgroundColor: colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...typography.titleMd,
    color: colors.onSurfaceVariant,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  userName: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  userEmail: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  userSchool: {
    ...typography.labelSm,
    color: colors.outline,
    marginTop: 4,
  },
  menuItem: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuContent: {
    flex: 1,
    minWidth: 0,
  },
  menuLabel: {
    ...typography.labelMd,
    color: colors.onSurface,
  },
  menuDescription: {
    ...typography.bodySm,
    color: colors.outline,
    marginTop: 2,
  },
  logoutButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: 14,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  logoutText: {
    ...typography.labelMd,
    color: colors.error,
  },
});

export default ProfileMenuScreen;
