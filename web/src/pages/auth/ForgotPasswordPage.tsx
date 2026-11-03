import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { AuthService } from '../../services/AuthService';
import { AuthBrandingPanel } from '../../components/auth/AuthBrandingPanel';
import { TextField } from '../../components/shared/TextField';
import { Button } from '../../components/shared/Button';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await AuthService.forgotPassword(email);
    } catch {
      // silently succeed
    } finally {
      setSubmittedEmail(email.trim());
      setIsSubmitted(true);
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
                <GraduationCap size={28} className="text-on-primary" />
              </div>
            </div>
            <h1 className="text-display-md font-display-md text-primary">Forgot Password</h1>
            <p className="mt-1 text-body-md text-on-surface-variant">
              Enter your email address and we'll send you a reset link.
            </p>
          </div>

          {isSubmitted ? (
            <div className="rounded-DEFAULT bg-primary-fixed p-4 text-body-md text-on-primary-fixed">
              If an account exists for <span className="font-label-md">{submittedEmail}</span>, a password
              reset link is on its way. Please check that inbox.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <TextField
                id="email"
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                autoComplete="email"
                error={error}
              />

              <Button
                type="submit"
                disabled={isSubmitting || !email.trim()}
                isLoading={isSubmitting}
                loadingText="Sending"
                className="w-full text-body-lg"
              >
                Send Reset Link
              </Button>
            </form>
          )}

          <div className="mt-6 border-t border-outline-variant pt-4 text-center">
            <p className="text-body-md">
              <Link to="/login" className="text-accent hover:text-accent-hover font-label-md">
                Back to Login
              </Link>
            </p>
          </div>

          <p className="mt-4 text-center text-label-sm text-on-surface-variant md:hidden">
            &copy; {new Date().getFullYear()} AlumniLink. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
