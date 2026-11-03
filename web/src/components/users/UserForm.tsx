import { useEffect, useState } from 'react';
import { Mail, AtSign, Lock, KeyRound } from 'lucide-react';

import type { UserFormInput, UserRole } from '../../types/Auth';
import type { SearchSuggestion } from '../../types/Search';

import { TextField } from '../shared/TextField';
import { FormErrorSummary } from '../shared/FormErrorSummary';
import { SelectField } from '../shared/SelectField';
import { Button } from '../shared/Button';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { HighlightedName } from '../shared/HighlightedName';
import { Switch } from '../shared/Switch';
import { PasswordStrengthIndicator } from '../settings/PasswordStrengthIndicator';
import { SchoolSelect } from '../registration/SchoolSelect';
import { AlumniSearchPicker } from './AlumniSearchPicker';
import { UserCreateFormSchema, UserEditFormSchema } from '../../schemas/UserSchema';
import { toFieldErrors } from '../../schemas/common';
import { PASSWORD_RULES, generatePassword } from '../../utils/passwordRules';
import { formatFullName } from '../../utils/formatName';
import { useToast } from '../../hooks/useToast';

const EMPTY_FIELD_ERRORS: Record<string, string[]> = {};

const USER_FIELD_IDS: Record<string, string> = {
  email: 'user-email',
  username: 'user-username',
  password: 'user-password',
  role: 'user-role',
  school_id: 'school-select',
};

/** The subset of a user record this form reads — loose enough to accept both `User` and `UserListItem`. */
interface UserFormInitialData {
  id?: number;
  name?: string;
  email?: string;
  username?: string;
  role?: UserRole | null;
  school_id?: number | null;
}

interface UserFormProps {
  initialData?: UserFormInitialData;
  onSubmit: (data: UserFormInput) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  onResetPassword?: () => Promise<{ message: string }>;
  isResettingPassword?: boolean;
  onSetPassword?: (password: string, notify: boolean) => Promise<{ message: string }>;
  isSettingPassword?: boolean;
}

export function UserForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
  error: formError,
  fieldErrors = EMPTY_FIELD_ERRORS,
  onResetPassword,
  isResettingPassword = false,
  onSetPassword,
  isSettingPassword = false,
}: UserFormProps) {
  const { showToast } = useToast();
  const [email, setEmail] = useState(initialData?.email || '');
  const [username, setUsername] = useState(initialData?.username || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(initialData?.role || 'alumni');
  const [schoolId, setSchoolId] = useState(initialData?.school_id?.toString() || '');
  const [pendingAlumniLink, setPendingAlumniLink] = useState<SearchSuggestion | null>(null);
  const [clientFieldErrors, setClientFieldErrors] = useState<Record<string, string[]>>({});
  const [clearedFields, setClearedFields] = useState<Set<string>>(new Set());
  const [resetPasswordMessage, setResetPasswordMessage] = useState('');
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [directPassword, setDirectPassword] = useState('');
  const [directPasswordError, setDirectPasswordError] = useState('');
  const [directPasswordDone, setDirectPasswordDone] = useState('');
  const [emailNewPassword, setEmailNewPassword] = useState(false);
  const [resetPasswordConfirmationOpen, setResetPasswordConfirmationOpen] = useState(false);
  const [setPasswordConfirmationOpen, setSetPasswordConfirmationOpen] = useState(false);
  const [passwordActionError, setPasswordActionError] = useState('');
  const isEdit = !!initialData?.id;

  // Errors from the last submit attempt are stale as soon as the user edits the
  // field they belong to; drop them from the display without waiting for another submit.
  useEffect(() => {
    setClearedFields(new Set());
  }, [fieldErrors]);

  function clearField(field: string) {
    setClearedFields((prev) => (prev.has(field) ? prev : new Set(prev).add(field)));
  }

  const rawFieldErrors: Record<string, string[]> = { ...fieldErrors, ...clientFieldErrors };
  const displayFieldErrors = Object.fromEntries(
    Object.entries(rawFieldErrors).filter(([field]) => !clearedFields.has(field)),
  );
  const hasFieldErrors = Object.keys(displayFieldErrors).length > 0;

  function handleRoleChange(nextRole: UserRole) {
    setRole(nextRole);
    clearField('role');
    if (nextRole !== 'school_admin') {
      setSchoolId('');
    }
    if (nextRole !== 'alumni') {
      setPendingAlumniLink(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const schoolIdValue = role === 'school_admin' && schoolId ? parseInt(schoolId, 10) : undefined;
    const result = isEdit
      ? UserEditFormSchema.safeParse({ email, username, role, school_id: schoolIdValue })
      : UserCreateFormSchema.safeParse({ email, username, role, school_id: schoolIdValue, password });

    if (!result.success) {
      const newClientErrors = toFieldErrors(result.error);
      setClientFieldErrors(newClientErrors);
      // Only reveal fields with a fresh error from *this* attempt — fields the
      // user already fixed since the last failed attempt should stay hidden.
      setClearedFields((prev) => {
        const next = new Set(prev);
        Object.keys(newClientErrors).forEach((field) => next.delete(field));
        return next;
      });
      return;
    }

    setClientFieldErrors({});

    const data: UserFormInput = { email, username, role };

    if (!isEdit) {
      data.password = password;
    }

    if (role === 'school_admin' && schoolId) {
      data.school_id = parseInt(schoolId, 10);
    }

    if (!isEdit && role === 'alumni' && pendingAlumniLink) {
      data.alumni_id = pendingAlumniLink.id;
    }

    await onSubmit(data);
  }

  async function confirmResetPassword() {
    if (!onResetPassword) {
      return;
    }

    setResetPasswordMessage('');
    setResetPasswordError('');

    try {
      const result = await onResetPassword();
      setResetPasswordMessage(result.message);
      showToast(result.message);
      setResetPasswordConfirmationOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to email the password reset link.';
      setResetPasswordError(message);
      setPasswordActionError(message);
      showToast(message, 'error');
    }
  }

  async function confirmSetPassword() {
    if (!onSetPassword) {
      return;
    }

    setDirectPasswordError('');
    setDirectPasswordDone('');

    if (!PASSWORD_RULES.every((rule) => rule.test(directPassword))) {
      setDirectPasswordError('Password does not meet all the requirements below.');
      return;
    }

    try {
      const result = await onSetPassword(directPassword, emailNewPassword);
      setDirectPassword('');
      setDirectPasswordDone(result.message);
      showToast(result.message);
      setSetPasswordConfirmationOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to set the password.';
      setDirectPasswordError(message);
      setPasswordActionError(message);
      showToast(message, 'error');
    }
  }

  function handleResetPassword() {
    setResetPasswordError('');
    setPasswordActionError('');
    setResetPasswordConfirmationOpen(true);
  }

  function handleSetPassword() {
    setDirectPasswordError('');
    setDirectPasswordDone('');

    if (!PASSWORD_RULES.every((rule) => rule.test(directPassword))) {
      setDirectPasswordError('Password does not meet all the requirements below.');
      return;
    }

    setPasswordActionError('');
    setSetPasswordConfirmationOpen(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="user-email"
          label="Email *"
          icon={Mail}
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); clearField('email'); }}
          required
          error={displayFieldErrors.email?.[0]}
          hideErrorText
        />

        <TextField
          id="user-username"
          label="Username *"
          icon={AtSign}
          type="text"
          value={username}
          onChange={(e) => { setUsername(e.target.value); clearField('username'); }}
          required
          error={displayFieldErrors.username?.[0]}
          hideErrorText
        />
      </div>

      {!isEdit && (
        <div>
          <TextField
            id="user-password"
            label="Password *"
            icon={Lock}
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); clearField('password'); }}
            required
            autoComplete="new-password"
            error={displayFieldErrors.password?.[0]}
            hideErrorText
          />

          <PasswordStrengthIndicator password={password} />

          <div className="mt-2 space-y-1">
            {PASSWORD_RULES.map((rule) => (
              <div key={rule.label} className="flex items-center gap-2 text-label-sm">
                <span className={rule.test(password) ? 'text-on-success-container' : 'text-outline'}>
                  {rule.test(password) ? '✓' : '○'}
                </span>
                <span className={rule.test(password) ? 'text-on-success-container' : 'text-on-surface-variant'}>{rule.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isEdit && (onResetPassword || onSetPassword) && (
        <div className="space-y-4 rounded-DEFAULT border border-outline-variant/60 bg-surface-container/40 p-3">
          <p className="flex items-center gap-1.5 text-label-md font-label-md text-on-surface">
            <KeyRound size={14} className="shrink-0 text-on-surface-variant" aria-hidden="true" />
            Password
          </p>

          {onSetPassword && (
            <div>
              <p className="text-body-sm text-on-surface-variant">
                Set a new password now. The user is signed out of their other sessions and can change it themselves afterwards.
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { setDirectPassword(generatePassword()); setDirectPasswordError(''); setDirectPasswordDone(''); }}
                  className="shrink-0"
                >
                  Generate
                </Button>
                <input
                  id="user-direct-password"
                  aria-label="New password"
                  type="text"
                  value={directPassword}
                  onChange={(e) => { setDirectPassword(e.target.value); setDirectPasswordError(''); setDirectPasswordDone(''); }}
                  autoComplete="off"
                  placeholder="New password"
                  className="block w-full flex-1 rounded-DEFAULT border border-outline-variant bg-white px-3 py-2 text-body-md text-on-surface transition-colors placeholder:text-on-surface-variant hover:border-outline focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSetPassword}
                  isLoading={isSettingPassword}
                  loadingText="Saving"
                  disabled={!directPassword}
                  className="shrink-0"
                >
                  {emailNewPassword ? 'Set & Email' : 'Set Password'}
                </Button>
              </div>
              <div className="mt-3 rounded-DEFAULT border border-outline-variant/60 bg-white px-3">
                <Switch
                  id="user-email-new-password"
                  checked={emailNewPassword}
                  onChange={setEmailNewPassword}
                  label={`Email the new password to ${initialData?.email ?? "the account's current email"}`}
                  description="Sent to the account's currently set email address"
                />
              </div>
              {directPassword && <PasswordStrengthIndicator password={directPassword} />}
              {directPassword && (
                <div className="mt-2 space-y-1">
                  {PASSWORD_RULES.map((rule) => (
                    <div key={rule.label} className="flex items-center gap-2 text-label-sm">
                      <span className={rule.test(directPassword) ? 'text-on-success-container' : 'text-outline'}>
                        {rule.test(directPassword) ? '✓' : '○'}
                      </span>
                      <span className={rule.test(directPassword) ? 'text-on-success-container' : 'text-on-surface-variant'}>{rule.label}</span>
                    </div>
                  ))}
                </div>
              )}
              {directPasswordError && <p className="mt-2 text-body-sm text-error">{directPasswordError}</p>}
              {directPasswordDone && <p className="mt-2 text-body-sm text-on-success-container">{directPasswordDone}</p>}
            </div>
          )}

          {onResetPassword && (
          <div className={onSetPassword ? 'border-t border-outline-variant/60 pt-4' : undefined}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-body-sm text-on-surface-variant">
              Email a password reset link to this user. The link expires in 60 minutes and can only be used once.
            </p>
            <Button
              variant="secondary"
              onClick={handleResetPassword}
              isLoading={isResettingPassword}
              loadingText="Sending"
              className="shrink-0"
            >
              Email Reset Link
            </Button>
          </div>
          {resetPasswordMessage && <p className="mt-2 text-body-sm text-on-success-container">{resetPasswordMessage}</p>}
          {resetPasswordError && (
            <p className="mt-2 text-body-sm text-error">{resetPasswordError}</p>
          )}
          </div>
          )}
        </div>
      )}

      <div className={role === 'school_admin' ? 'grid grid-cols-1 gap-4 sm:grid-cols-2' : ''}>
        {role === 'super_admin' ? (
          <div>
            <label htmlFor="user-role" className="block text-label-md font-label-md text-on-surface">
              Role *
            </label>
            <p id="user-role" tabIndex={-1} className="mt-1 rounded-DEFAULT border border-outline-variant bg-surface-container px-3 py-2 text-body-md text-on-surface-variant">
              Super Admin. This role cannot be reassigned.
            </p>
          </div>
        ) : (
          <SelectField
            id="user-role"
            label="Role *"
            value={role}
            onChange={(e) => handleRoleChange(e.target.value as UserRole)}
          >
            <option value="alumni">Alumni</option>
            <option value="school_admin">School Admin</option>
          </SelectField>
        )}

        {role === 'school_admin' && (
          <SchoolSelect
            value={schoolId}
            onChange={(value) => { setSchoolId(value); clearField('school_id'); }}
            error={displayFieldErrors.school_id?.[0]}
            hideErrorText
            required
          />
        )}
      </div>

      {!isEdit && role === 'alumni' && (
        <div className="rounded-DEFAULT border border-outline-variant/60 bg-surface-container/40 p-3">
          <p className="text-label-md font-label-md text-on-surface">Link Alumni Record</p>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            Optional. Search for the alumni record this account belongs to.
          </p>
          <div className="mt-3">
            {pendingAlumniLink ? (
              <div className="flex items-center justify-between gap-3 rounded-DEFAULT border border-outline-variant p-3">
                <div className="min-w-0">
                  <p className="truncate text-body-md font-label-md text-on-surface">
                    {formatFullName(pendingAlumniLink)}
                  </p>
                  <p className="text-label-sm text-on-surface-variant">Batch {pendingAlumniLink.graduation_year}</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setPendingAlumniLink(null)} className="shrink-0">
                  Change
                </Button>
              </div>
            ) : (
              <AlumniSearchPicker
                targetUserName={username}
                onSelect={(alumni) => { setPendingAlumniLink(alumni); }}
              />
            )}
          </div>
        </div>
      )}

      {(formError || hasFieldErrors) && (
        <FormErrorSummary
          message={formError || 'Please correct the highlighted fields below.'}
          fieldErrors={displayFieldErrors}
          fieldIds={USER_FIELD_IDS}
        />
      )}

      <div className="flex justify-end gap-3 border-t border-outline-variant/60 pt-4">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!email.trim() || !username.trim() || (role === 'school_admin' && !schoolId)}
          isLoading={isSubmitting}
          loadingText="Saving"
        >
          Save
        </Button>
      </div>

      <ConfirmDialog
        isOpen={resetPasswordConfirmationOpen}
        title={<>Email a password reset link to <HighlightedName>{initialData?.name ?? initialData?.email ?? 'this user'}</HighlightedName>?</>}
        message={`A one-time password reset link will be emailed to ${initialData?.email ?? 'this account'}. The link expires in 60 minutes and can only be used once.`}
        confirmLabel="Email reset link"
        onConfirm={() => { void confirmResetPassword(); }}
        onCancel={() => {
          if (!isResettingPassword) {
            setResetPasswordConfirmationOpen(false);
            setPasswordActionError('');
          }
        }}
        isLoading={isResettingPassword}
        error={passwordActionError}
        onRetry={() => { void confirmResetPassword(); }}
      />

      <ConfirmDialog
        isOpen={setPasswordConfirmationOpen}
        title={<>Set a new password for <HighlightedName>{initialData?.name ?? initialData?.email ?? 'this user'}</HighlightedName>?</>}
        message={emailNewPassword
          ? `The new password will be saved, all of this user's other sessions will be signed out, and the password will be emailed to ${initialData?.email ?? 'the account email'}.`
          : `The new password will be saved and all of this user's other sessions will be signed out.`}
        confirmLabel={emailNewPassword ? 'Set and email password' : 'Set password'}
        onConfirm={() => { void confirmSetPassword(); }}
        onCancel={() => {
          if (!isSettingPassword) {
            setSetPasswordConfirmationOpen(false);
            setPasswordActionError('');
          }
        }}
        isLoading={isSettingPassword}
        error={passwordActionError}
        onRetry={() => { void confirmSetPassword(); }}
      />
    </form>
  );
}
