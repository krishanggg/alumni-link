import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { AuthService } from '../../services/AuthService';
import { ApiError } from '../../services/api';
import { AuthBrandingPanel } from '../../components/auth/AuthBrandingPanel';
import { TextField } from '../../components/shared/TextField';
import { Button } from '../../components/shared/Button';
import { usePressTap } from '../../hooks/usePressTap';
import { MotionLink } from '../../components/shared/MotionLink';
import type { PasswordStrengthTier } from '../../utils/passwordRules';
import { PASSWORD_RULES, isPasswordValid, passwordStrength } from '../../utils/passwordRules';

const STRENGTH_BAR_CLASSES: Record<PasswordStrengthTier, string> = {
  Weak: 'bg-error',
  Fair: 'bg-chart-amber',
  Strong: 'bg-chart-green',
};

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const pressTap = usePressTap();

  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [linkRejected, setLinkRejected] = useState(false);

  useEffect(() => {
    if (!token || !email) {
      setIsExpired(true);
    }
  }, [token, email]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');

      return;
    }

    if (!isPasswordValid(password)) {
      setError('Password does not meet the requirements listed below.');

      return;
    }

    setIsSubmitting(true);
    setLinkRejected(false);

    try {
      await AuthService.resetPassword(token, email, password, confirmPassword);
      setIsSuccess(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        // The link was structurally fine but the server rejected it — most
        // often because a newer reset link was requested (each request
        // invalidates the previous one), or it has already been used. Keep
        // the form visible and explain, rather than a full-page takeover.
        setLinkRejected(true);
        setError(err.message || 'This reset link is no longer valid.');
      } else {
        setError(err instanceof ApiError ? err.message : 'An error occurred.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isExpired) {
    return (
      <div className="bg-app-canvas bg-app-canvas--dim flex min-h-screen items-center justify-center px-4 py-8">
        <div className="grid w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-sm border border-outline-variant md:grid-cols-2">
          <AuthBrandingPanel />
          <div className="flex flex-col justify-center p-8 sm:p-10 text-center">
            <div className="mb-4 flex justify-center md:hidden">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-container">
                <GraduationCap size={28} className="text-on-primary" />
              </div>
            </div>
            <h1 className="text-display-md font-display-md text-primary">Link Expired</h1>
            <p className="mt-2 text-body-md text-on-surface-variant">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <MotionLink
              to="/forgot-password"
              {...pressTap}
              className="mt-4 inline-block rounded-DEFAULT bg-accent px-4 py-2 text-body-lg font-label-md text-on-primary hover:bg-accent-hover"
            >
              Request New Reset Link
            </MotionLink>
            <p className="mt-4 text-center text-label-sm text-on-surface-variant md:hidden">
              &copy; {new Date().getFullYear()} AlumniLink. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="bg-app-canvas bg-app-canvas--dim flex min-h-screen items-center justify-center px-4 py-8">
        <div className="grid w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-sm border border-outline-variant md:grid-cols-2">
          <AuthBrandingPanel />
          <div className="flex flex-col justify-center p-8 sm:p-10 text-center">
            <div className="mb-4 flex justify-center md:hidden">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-container">
                <GraduationCap size={28} className="text-on-primary" />
              </div>
            </div>
            <h1 className="text-display-md font-display-md text-primary">Password Reset</h1>
            <p className="mt-2 text-body-md text-on-surface-variant">
              Your password has been reset successfully.
            </p>
            <MotionLink
              to="/login"
              {...pressTap}
              className="mt-4 inline-block rounded-DEFAULT bg-accent px-4 py-2 text-body-lg font-label-md text-on-primary hover:bg-accent-hover"
            >
              Back to Login
            </MotionLink>
            <p className="mt-4 text-center text-label-sm text-on-surface-variant md:hidden">
              &copy; {new Date().getFullYear()} AlumniLink. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const strength = passwordStrength(password);

  return (
    <div className="bg-app-canvas bg-app-canvas--dim flex min-h-screen items-center justify-center px-4 py-8">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-sm border border-outline-variant md:grid-cols-2">
        <AuthBrandingPanel />
        <div className="flex flex-col justify-center p-8 sm:p-10">
          <div className="mb-6 text-center md:text-left">
            <div className="mb-4 flex justify-center md:hidden">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-container">
                <GraduationCap size={28} className="text-on-primary" />
              </div>
            </div>
            <h1 className="text-display-md font-display-md text-primary">Reset Password</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <TextField
                id="newPassword"
                label="New Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />

              {password && (
                <div className="mt-2">
                  <div className="h-1 w-full rounded-full bg-surface-container">
                    <div
                      className={`h-1 rounded-full transition-all ${STRENGTH_BAR_CLASSES[strength.tier]}`}
                      style={{ width: `${strength.ratio * 100}%` }}
                    />
                  </div>
                  <p className="mt-1 text-label-sm text-on-surface-variant">
                    Strength: {strength.tier}
                  </p>
                </div>
              )}
            </div>

            <TextField
              id="confirmPassword"
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />

            <div className="space-y-1">
              <p className="text-label-sm font-label-sm text-on-surface-variant">Password requirements:</p>
              {PASSWORD_RULES.map((rule) => (
                <div key={rule.label} className="flex items-center gap-2 text-label-sm">
                  <span className={rule.test(password) ? 'text-on-success-container' : 'text-outline'}>
                    {rule.test(password) ? '✓' : '○'}
                  </span>
                  <span className={rule.test(password) ? 'text-on-success-container' : 'text-on-surface-variant'}>
                    {rule.label}
                  </span>
                </div>
              ))}
            </div>

            {error && (
              <div className="rounded-DEFAULT bg-error-container p-3 text-body-md text-on-error-container" role="alert">
                {error}
                {linkRejected && (
                  <MotionLink
                    to="/forgot-password"
                    {...pressTap}
                    className="mt-2 block font-label-md text-on-error-container underline"
                  >
                    Request a new reset link
                  </MotionLink>
                )}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              isLoading={isSubmitting}
              loadingText="Resetting"
              className="w-full text-body-lg"
            >
              Reset Password
            </Button>
          </form>

          <p className="mt-4 text-center text-label-sm text-on-surface-variant md:hidden">
            &copy; {new Date().getFullYear()} AlumniLink. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
