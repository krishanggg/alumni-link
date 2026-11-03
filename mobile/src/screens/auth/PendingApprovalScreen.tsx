import { useState, useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import { useAuth } from '../../contexts/AuthContext';

import { useApprovalStatus } from '../../hooks/useApprovalStatus';
import ResubmitScreen from './ResubmitScreen';
import Icon from '../../components/shared/Icon';

import { colors, presets, ripple, spacing, typography } from '../../theme';

// Precisely the screens where a stuck alumnus most needs a way to reach a
// human: no other part of the app offers a help path before this one. The
// school name is already loaded on `user` regardless of approval status, so
// this needs no new data — just the copy pointing the user at who to ask.
function HelpNote({ schoolName }: { schoolName?: string }) {
  return (
    <View style={styles.helpBox}>
      <Icon name="info" size={16} color={colors.onSurfaceVariant} />
      <Text style={styles.helpText}>
        Need help? Contact{schoolName ? ` ${schoolName}'s` : ' your school’s'} admin
        office directly with questions about your registration.
      </Text>
    </View>
  );
}

function PendingApprovalScreen() {
  const { user, logout, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [resubmitSuccess, setResubmitSuccess] = useState(false);

  // No skeleton and no spinner: every word on this card comes from the already
  // resolved `AuthContext.user`, and the request only supplies the rejection
  // reason when the user object is missing one — nothing here should block on
  // a fetch it doesn't own.
  const { status } = useApprovalStatus();

  const handleResubmitSuccess = useCallback(async () => {
    await refreshUser();
    setResubmitSuccess(true);
    setIsEditing(false);
  }, [refreshUser]);

  // Approval is finalized server-side the moment an admin acts — there is no
  // separate "finalize" step a user must trigger. This carries the
  // already-approved status into `AuthContext.user` so `AppNavigator` swaps to
  // the authenticated stack on its own, via the app's one automatic refresh
  // mechanism (`useAppStateFocus`, see queryClient.ts) rather than a button.
  useEffect(() => {
    if (status?.status === 'approved') {
      refreshUser();
    }
  }, [status, refreshUser]);

  const rejectionReason = status?.rejection_reason ?? user?.rejection_reason;
  const isRejected = user?.account_status === 'rejected';
  const isPending = user?.account_status === 'pending';

  if (isEditing) {
    return (
      <ResubmitScreen
        onCancel={() => setIsEditing(false)}
        onSuccess={handleResubmitSuccess}
      />
    );
  }

  if (resubmitSuccess) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>AlumniLink</Text>
          <Text style={styles.heading}>Submitted for Review</Text>
          <Text style={styles.description}>
            Your registration has been resubmitted for review. An administrator will review it shortly.
          </Text>
          <HelpNote schoolName={user?.school?.name} />
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

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>AlumniLink</Text>

        {isPending && (
          <>
            <Text style={styles.heading}>Account Pending Approval</Text>
            <Text style={styles.description}>
              Your registration has been submitted and is awaiting review by an administrator.
              You will be notified once your account has been approved.
            </Text>
            <View style={styles.statusRow}>
              <View style={[styles.badge, styles.badgePending]}>
                <Text style={styles.badgeTextPending}>Pending</Text>
              </View>
            </View>
          </>
        )}

        {isRejected && (
          <>
            <Text style={styles.heading}>Account Not Approved</Text>
            <Text style={styles.description}>
              Your registration was not approved. You may edit your details and resubmit for review.
            </Text>
            <View style={styles.statusRow}>
              <View style={[styles.badge, styles.badgeRejected]}>
                <Text style={styles.badgeTextRejected}>Rejected</Text>
              </View>
            </View>
            {rejectionReason ? (
              <View style={styles.reasonBox}>
                <Text style={styles.reasonLabel}>Reason:</Text>
                <Text style={styles.reasonText}>{rejectionReason}</Text>
              </View>
            ) : null}
            {isRejected && (
            <Pressable
              style={styles.editButton}
              onPress={() => setIsEditing(true)}
              android_ripple={ripple.onDark}
              accessibilityRole="button"
              accessibilityLabel="Edit and resubmit registration"
            >
              <Text style={styles.editButtonText}>Edit & Resubmit Registration</Text>
            </Pressable>
            )}
          </>
        )}

        {!isPending && !isRejected && (
          <Text style={styles.description}>
            Your account status is being processed. Please contact an administrator.
          </Text>
        )}

        <HelpNote schoolName={user?.school?.name} />

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
    marginBottom: 16,
  },
  statusRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgePending: {
    backgroundColor: colors.warningContainer,
  },
  badgeTextPending: {
    ...typography.labelMd,
    color: colors.onWarningContainer,
  },
  badgeRejected: {
    backgroundColor: colors.errorContainer,
  },
  badgeTextRejected: {
    ...typography.labelMd,
    color: colors.onErrorContainer,
  },
  reasonBox: {
    backgroundColor: colors.errorContainer,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  reasonLabel: {
    ...typography.labelMd,
    color: colors.onErrorContainer,
    marginBottom: 4,
  },
  reasonText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  editButton: {
    ...presets.primaryButton,
    marginBottom: spacing.sm,
  },
  editButtonText: {
    ...typography.labelMd,
    color: colors.onPrimary,
  },
  helpBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 8,
    padding: 12,
    marginBottom: spacing.sm,
  },
  helpText: {
    ...typography.bodySm,
    flex: 1,
    color: colors.onSurfaceVariant,
  },
  logoutButton: {
    ...presets.secondaryButton,
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

export default PendingApprovalScreen;
