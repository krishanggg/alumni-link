import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { isAdminRole } from '../../types/Auth';
import { ALUMNI_WEB_ENABLED } from '../../config/features';
import { ApiError } from '../../services/api';
import { AuthBrandingPanel } from '../../components/auth/AuthBrandingPanel';
import { SchoolSeal } from '../../components/shared/icons/SchoolSeal';
import { TextField } from '../../components/shared/TextField';
import { Checkbox } from '../../components/shared/Checkbox';
import { Button } from '../../components/shared/Button';

function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [loginField, setLoginField] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ login?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    if (user.role === 'alumni' && !ALUMNI_WEB_ENABLED) {
      const canOpenProfileSettings =
        user.account_status === 'approved'
        && user.is_active
        && user.alumni_archived !== true
        && user.alumni_id !== null;

      navigate(canOpenProfileSettings ? '/settings/profile' : '/web-access-unavailable', { replace: true });
    } else if (!isAdminRole(user.role) || user.account_status !== 'approved') {
      navigate('/web-access-unavailable', { replace: true });
    } else {
      navigate('/dashboard/admin', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  if (isAuthenticated && user) {
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const nextFieldErrors: { login?: string; password?: string } = {};
    if (!loginField.trim()) {
      nextFieldErrors.login = 'Please enter your email or username.';
    }
    if (!password) {
      nextFieldErrors.password = 'Please enter your password.';
    }
    if (nextFieldErrors.login || nextFieldErrors.password) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      await login({ login: loginField, password, remember });
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError('Too many login attempts. Please try again in 15 minutes.');
      } else if (err instanceof ApiError && err.status === 401) {
        setError('The email/username or password you entered is incorrect.');
      } else if (err instanceof ApiError && err.status === 403) {
        setError('Your account has been deactivated. Please contact an administrator.');
      } else {
        setError('Something went wrong. Please try again later.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="bg-app-canvas bg-app-canvas--dim flex min-h-screen items-center justify-center px-4 py-8">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-sm border border-outline-variant md:grid-cols-2">
        <AuthBrandingPanel />

        <div className="flex flex-col justify-center p-8 sm:p-10">
          <div className="mb-6 text-center md:text-left">
            <div className="mb-4 flex justify-center md:hidden">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-container">
                <SchoolSeal size={28} className="text-on-primary" />
              </div>
            </div>
            <h2 className="text-display-md font-display-md text-primary">Log In</h2>
            <p className="mt-1 text-body-md text-on-surface-variant">Please log in to your account.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate autoComplete="off">
            <TextField
              id="login"
              label="Email or Username"
              icon={User}
              type="text"
              value={loginField}
              onChange={(e) => {
                setLoginField(e.target.value);
                if (fieldErrors.login) {
                  setFieldErrors((prev) => ({ ...prev, login: undefined }));
                }
              }}
              placeholder="Enter your email or username"
              autoComplete="off"
              aria-invalid={Boolean(fieldErrors.login)}
              error={fieldErrors.login}
            />

            <div>
              <label htmlFor="password" className="block text-label-md font-label-md text-on-surface">
                Password
              </label>
              <div className="relative mt-1">
                <Lock size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                  className={`block w-full rounded-DEFAULT border py-2 pl-10 pr-10 text-body-md focus:outline-none focus:ring-2 ${
                    fieldErrors.password
                      ? 'border-error focus:border-error focus:ring-error/20'
                      : 'border-outline-variant focus:border-accent focus:ring-accent/20'
                  }`}
                  placeholder="Enter your password"
                  autoComplete="new-password"
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="tap-target rounded-DEFAULT p-1 text-on-surface-variant hover:text-on-surface"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              {fieldErrors.password && (
                <p id="login-password-error" className="mt-1 text-label-sm text-error" role="alert">{fieldErrors.password}</p>
              )}
            </div>

            {error && (
              <div className="rounded-DEFAULT bg-error-container p-3 text-body-md text-on-error-container" role="alert">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between">
              <Checkbox
                label="Remember Me"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <Link to="/forgot-password" className="text-label-md font-label-md text-accent hover:text-accent-hover">
                Forgot Password?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              isLoading={isSubmitting}
              loadingText="Logging in"
              className="w-full py-2.5 text-body-lg tracking-wide"
            >
              LOG IN
            </Button>
          </form>

          <p className="mt-6 border-t border-outline-variant pt-4 text-center text-body-md text-on-surface-variant">
            Alumni access is provided through the AlumniLink mobile app.
          </p>

          <p className="mt-4 text-center text-label-sm text-on-surface-variant md:hidden">
            &copy; {new Date().getFullYear()} AlumniLink. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
