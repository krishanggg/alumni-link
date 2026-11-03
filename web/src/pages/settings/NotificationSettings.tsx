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
            <h2 className="text-headline-sm font-headline-sm text-on-surface">Email Notifications</h2>
            <p className="mt-1 text-body-md text-on-surface-variant">Choose which notifications you receive by email.</p>
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
              description="Get notified about password changes and login from new devices"
              checked={preferences.account_activity}
              onChange={(value) => handleToggle('account_activity', value)}
            />
            <Switch
              label="Alumni Record Updates"
              description="Get notified when your linked alumni record is modified by an admin"
              checked={preferences.alumni_record_updates}
              onChange={(value) => handleToggle('alumni_record_updates', value)}
            />
            <Switch
              label="System Announcements"
              description="Get notified about new announcements from the school"
              checked={preferences.system_announcements}
              onChange={(value) => handleToggle('system_announcements', value)}
            />
            <Switch
              label="Report Completion"
              description="Get notified when a new report is completed"
              checked={preferences.report_completion}
              onChange={(value) => handleToggle('report_completion', value)}
            />
            {user?.role !== 'alumni' && (
              <Switch
                label="Feedback Replies"
                description="Get notified when someone replies to a feedback conversation"
                checked={preferences.feedback}
                onChange={(value) => handleToggle('feedback', value)}
              />
            )}
          </div>
        </div>
      </form>
    </SettingsLayout>
  );
}
