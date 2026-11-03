import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, ShieldQuestion, LogIn } from 'lucide-react';
import { SettingsLayout } from '../../components/settings/SettingsLayout';
import { PasswordStrengthIndicator } from '../../components/settings/PasswordStrengthIndicator';
import { SessionsList } from '../../components/settings/SessionsList';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { HighlightedName } from '../../components/shared/HighlightedName';
import { TextField } from '../../components/shared/TextField';
import { Button } from '../../components/shared/Button';
import { ProfileService } from '../../services/ProfileService';
import { SessionService } from '../../services/SessionService';
import { RememberedDeviceService } from '../../services/RememberedDeviceService';
import type { SessionItem, RememberedDevice } from '../../types/Profile';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';

type DeviceConfirmationTarget =
  | { kind: 'device'; device: RememberedDevice }
  | { kind: 'all'; count: number };

export default function SecuritySettings() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordConfirmationOpen, setPasswordConfirmationOpen] = useState(false);
  const [passwordActionError, setPasswordActionError] = useState('');

  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [sessionSuccess, setSessionSuccess] = useState('');

  const [devices, setDevices] = useState<RememberedDevice[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [deviceError, setDeviceError] = useState('');
  const [deviceSuccess, setDeviceSuccess] = useState('');
  const [deviceConfirmationTarget, setDeviceConfirmationTarget] = useState<DeviceConfirmationTarget | null>(null);
  const [pendingDeviceAction, setPendingDeviceAction] = useState<DeviceConfirmationTarget | null>(null);
  const [deviceActionError, setDeviceActionError] = useState('');

  const loadSessions = useCallback(async () => {
    try {
      const data = await SessionService.listSessionsForCurrentUser();
      setSessions(data.sessions);
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const loadDevices = useCallback(async () => {
    try {
      const data = await RememberedDeviceService.listRememberedDevicesForCurrentUser();
      setDevices(data.devices);
    } catch (err) {
      setDeviceError(err instanceof Error ? err.message : 'Failed to load remembered devices');
    } finally {
      setDevicesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
    loadDevices();
  }, [loadSessions, loadDevices]);

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    setPasswordActionError('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordConfirmationOpen(true);
  }

  async function confirmChangePassword() {
    setIsChangingPassword(true);
    setPasswordActionError('');

    try {
      await ProfileService.changePasswordForCurrentUser(currentPassword, newPassword, confirmPassword);
      const message = 'Password changed successfully.';
      setPasswordSuccess(message);
      showToast(message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordConfirmationOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to change password';
      setPasswordActionError(message);
      showToast(message, 'error');
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function handleTerminateSession(id: string) {
    setSessionError('');
    setSessionSuccess('');

    try {
      await SessionService.terminateSessionForCurrentUser(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setSessionSuccess('Session terminated.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to terminate session';
      setSessionError(message);
      throw err instanceof Error ? err : new Error(message);
    }
  }

  async function handleTerminateAllSessions() {
    setSessionError('');
    setSessionSuccess('');

    try {
      await SessionService.terminateAllSessionsForCurrentUser();
      setSessions((prev) => prev.filter((s) => s.is_current));
      setSessionSuccess('All other sessions terminated.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to terminate sessions';
      setSessionError(message);
      throw err instanceof Error ? err : new Error(message);
    }
  }

  function openDeviceConfirmation(target: DeviceConfirmationTarget) {
    setDeviceActionError('');
    setDeviceConfirmationTarget(target);
  }

  async function confirmDeviceAction() {
    if (!deviceConfirmationTarget) {
      return;
    }

    const target = deviceConfirmationTarget;
    setPendingDeviceAction(target);
    setDeviceActionError('');
    setDeviceError('');
    setDeviceSuccess('');

    try {
      if (target.kind === 'device') {
        await RememberedDeviceService.revokeRememberedDeviceForCurrentUser(target.device.id);
        setDevices((prev) => prev.filter((d) => d.id !== target.device.id));
        setDeviceSuccess('Auto-login revoked for this device.');
        showToast('Auto-login revoked for this device.');
      } else {
        await RememberedDeviceService.revokeAllRememberedDevicesForCurrentUser();
        setDevices([]);
        setDeviceSuccess('Auto-login revoked for all devices.');
        showToast('Auto-login revoked for all devices.');
      }
      setDeviceConfirmationTarget(null);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : target.kind === 'device' ? 'Failed to revoke device' : 'Failed to revoke all devices';
      setDeviceError(message);
      setDeviceActionError(message);
      showToast(message, 'error');
    } finally {
      setPendingDeviceAction(null);
    }
  }

  return (
    <SettingsLayout>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-lg border border-outline-variant/70 bg-white shadow-card">
            <div className="border-b border-outline-variant/70 px-6 py-4">
              <h2 className="text-headline-sm font-headline-sm text-on-surface">Change Password</h2>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4 p-6">
              {passwordError && (
                <div className="rounded-DEFAULT bg-error-container p-3 text-body-md text-on-error-container" role="alert">
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="rounded-DEFAULT bg-success-container p-3 text-body-md text-on-success-container" role="status">
                  {passwordSuccess}
                </div>
              )}

              <TextField
                id="currentPassword"
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />

              <div>
                <TextField
                  id="newPassword"
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <PasswordStrengthIndicator password={newPassword} />
                <p className="mt-1 text-label-sm text-on-surface-variant">
                  Minimum 8 characters, at least 1 uppercase letter, 1 number, and 1 special character.
                </p>
              </div>

              <TextField
                id="confirmPassword"
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              <Button type="submit" disabled={isChangingPassword || passwordConfirmationOpen} isLoading={isChangingPassword} loadingText="Changing">
                Update Password
              </Button>
            </form>
          </section>

          <section className="rounded-lg border border-outline-variant/70 bg-white shadow-card p-6">
            <h2 className="text-headline-sm font-headline-sm text-on-surface">Security Tips</h2>
            <div className="mt-4 flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-container text-on-success-container">
                <ShieldCheck size={20} aria-hidden="true" />
              </span>
              <ul className="list-disc space-y-1.5 pl-4 text-body-md text-on-surface-variant">
                <li>Use a strong password that you don&apos;t use elsewhere.</li>
                <li>Log out of unused devices and browsers.</li>
                <li>Keep your account credentials confidential.</li>
              </ul>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="overflow-hidden rounded-lg border border-outline-variant/70 bg-white shadow-card">
            <div className="border-b border-outline-variant/70 px-6 py-4">
              <h2 className="text-headline-sm font-headline-sm text-on-surface">Active Sessions</h2>
            </div>

            <div className="p-6">
              {sessionError && (
                <div className="mb-4 rounded-DEFAULT bg-error-container p-3 text-body-md text-on-error-container" role="alert">
                  {sessionError}
                </div>
              )}

              {sessionSuccess && (
                <div className="mb-4 rounded-DEFAULT bg-success-container p-3 text-body-md text-on-success-container" role="status">
                  {sessionSuccess}
                </div>
              )}

              <SessionsList
                sessions={sessions}
                onTerminate={handleTerminateSession}
                onTerminateAll={handleTerminateAllSessions}
                isLoading={sessionsLoading}
              />
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-outline-variant/70 bg-white shadow-card">
            <div className="flex items-center gap-3 border-b border-outline-variant/70 px-6 py-4">
              <LogIn size={18} className="text-on-surface-variant" aria-hidden="true" />
              <h2 className="text-headline-sm font-headline-sm text-on-surface">Remembered Devices</h2>
            </div>

            <div className="p-6">
              {deviceError && (
                <div className="mb-4 rounded-DEFAULT bg-error-container p-3 text-body-md text-on-error-container" role="alert">
                  {deviceError}
                </div>
              )}

              {deviceSuccess && (
                <div className="mb-4 rounded-DEFAULT bg-success-container p-3 text-body-md text-on-success-container" role="status">
                  {deviceSuccess}
                </div>
              )}

              {devicesLoading ? (
                <div className="animate-pulse space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-12 rounded-DEFAULT bg-surface-container" />
                  ))}
                </div>
              ) : devices.length === 0 ? (
                <p className="flex items-center gap-2 text-body-md text-on-surface-variant">
                  <ShieldQuestion size={16} aria-hidden="true" />
                  No remembered devices.
                </p>
              ) : (
                <>
                  <ul className="divide-y divide-outline-variant">
                    {devices.map((device) => (
                      <li key={device.id} className="flex items-center justify-between py-3">
                        <div>
                          <p className="text-body-md text-on-surface">{device.device_name}</p>
                          <p className="text-label-sm text-on-surface-variant">
                            {device.ip_address || 'Unknown IP'}
                            {device.last_used_at && ` • Last used: ${new Date(device.last_used_at).toLocaleString()}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openDeviceConfirmation({ kind: 'device', device })}
                          disabled={deviceConfirmationTarget !== null || pendingDeviceAction !== null}
                          className="rounded-DEFAULT px-3 py-1 text-label-sm font-label-sm text-error hover:bg-error-container disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Revoke
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => openDeviceConfirmation({ kind: 'all', count: devices.length })}
                    disabled={deviceConfirmationTarget !== null || pendingDeviceAction !== null}
                    className="mt-3 rounded-DEFAULT px-4 py-2 text-body-md font-label-md text-error hover:bg-error-container disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Revoke All
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      </div>

      <ConfirmDialog
        isOpen={passwordConfirmationOpen}
        title={<>Change the password for <HighlightedName>{user?.name ?? user?.email ?? 'your account'}</HighlightedName>?</>}
        message="Your current password will be replaced. Other web sessions and mobile tokens will be signed out, remembered-device auto-login will be revoked, and this device will stay signed in."
        confirmLabel="Change password"
        variant="danger"
        onConfirm={() => { void confirmChangePassword(); }}
        onCancel={() => {
          if (!isChangingPassword) {
            setPasswordConfirmationOpen(false);
            setPasswordActionError('');
          }
        }}
        isLoading={isChangingPassword}
        error={passwordActionError}
        onRetry={() => { void confirmChangePassword(); }}
      />

      <ConfirmDialog
        isOpen={deviceConfirmationTarget !== null}
        title={deviceConfirmationTarget?.kind === 'all'
          ? `Revoke auto-login for ${deviceConfirmationTarget.count} device${deviceConfirmationTarget.count === 1 ? '' : 's'}?`
          : <>Revoke auto-login for <HighlightedName>{deviceConfirmationTarget?.device.device_name || 'this device'}</HighlightedName>?</>}
        message={deviceConfirmationTarget?.kind === 'all'
          ? `All ${deviceConfirmationTarget.count} remembered-device tokens will be deleted. You will need to sign in with your password again on those devices.`
          : 'This remembered-device token will be deleted, so this device will need a password sign-in the next time auto-login is used.'}
        confirmLabel="Revoke"
        variant="danger"
        onConfirm={() => { void confirmDeviceAction(); }}
        onCancel={() => {
          if (pendingDeviceAction === null) {
            setDeviceConfirmationTarget(null);
            setDeviceActionError('');
          }
        }}
        isLoading={pendingDeviceAction !== null}
        error={deviceActionError}
        onRetry={() => { void confirmDeviceAction(); }}
      />
    </SettingsLayout>
  );
}
