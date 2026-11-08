import { useState, useEffect } from 'react';
import { CheckCircle2, Save } from 'lucide-react';
import { SettingsLayout } from '../../components/settings/SettingsLayout';
import { Switch } from '../../components/shared/Switch';
import { Button } from '../../components/shared/Button';
import { NotificationService } from '../../services/NotificationService';
import type { NotificationPreferences } from '../../types/Profile';
import { useAuth } from '../../hooks/useAuth';

export default function NotificationSettings() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [savedPreferences, setSavedPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const hasChanges = JSON.stringify(preferences) !== JSON.stringify(savedPreferences);
  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    async function load() {
      try {
        const data = await NotificationService.getNotificationPreferencesForCurrentUser();
        setPreferences(data.preferences);
        setSavedPreferences(data.preferences);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load notification preferences');
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, []);

  function handleToggle(key: keyof NotificationPreferences, value: boolean) {
    if (!preferences) {
      return;
    }

    setPreferences({ ...preferences, [key]: value });
    setSuccess('');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!preferences) {
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const data = await NotificationService.updateNotificationPreferencesForCurrentUser(preferences);
      setPreferences(data.preferences);
      setSavedPreferences(data.preferences);
      setSuccess('Preferences saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <SettingsLayout>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 rounded-DEFAULT bg-surface-container" />
          ))}
        </div>
      </SettingsLayout>
    );
  }

  if (!preferences) {
    return (
      <SettingsLayout>
        <div className="rounded-DEFAULT bg-error-container p-4 text-on-error-container" role="alert">
          {error || 'Failed to load notification preferences.'}
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout>
      <form onSubmit={handleSave} className="overflow-hidden rounded-lg border border-outline-variant/70 bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-outline-variant/70 px-6 py-4">
          <div>
            <h2 className="text-headline-sm font-headline-sm text-on-surface">Admin Notification Preferences</h2>
            <p className="mt-1 text-body-md text-on-surface-variant">
              {isSuperAdmin
                ? 'Choose which account security and feedback updates you receive by email.'
                : 'Choose which account security, feedback, and school administration updates you receive by email.'}
            </p>
          </div>
          <Button type="submit" disabled={isSaving || !hasChanges} icon={Save} isLoading={isSaving} loadingText="Saving">
            Save Changes
          </Button>
        </div>

        <div className="space-y-4 p-6">
          {error && (
            <div className="rounded-DEFAULT bg-error-container p-3 text-body-md text-on-error-container" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-1.5 rounded-DEFAULT bg-success-container p-3 text-body-md text-on-success-container" role="status">
              <CheckCircle2 size={16} aria-hidden="true" />
              {success}
            </div>
          )}

          <div className="divide-y divide-outline-variant rounded-lg border border-outline-variant/70 bg-white px-4">
            <Switch
              label="Account Activity"
              description="Get an email about password changes and sign-ins from a new location."
              checked={preferences.account_activity}
              onChange={(value) => handleToggle('account_activity', value)}
            />
            <Switch
              label="Feedback Conversation Updates"
              description={isSuperAdmin
                ? 'Get an email when a school admin starts or replies to a conversation, or its status changes.'
                : 'Get an email when a super admin replies to or changes the status of a conversation for your school.'}
              checked={preferences.feedback}
              onChange={(value) => handleToggle('feedback', value)}
            />
            {!isSuperAdmin && (
              <Switch
                label="School Administration Notices"
                description="Get an email when a Super Admin changes or removes a record for your school."
                checked={preferences.administrative_notices}
                onChange={(value) => handleToggle('administrative_notices', value)}
              />
            )}
          </div>
        </div>
      </form>
    </SettingsLayout>
  );
}
