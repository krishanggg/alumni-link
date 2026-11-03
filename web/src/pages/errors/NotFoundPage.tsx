import { FileQuestion } from 'lucide-react';

import { MotionLink } from '../../components/shared/MotionLink';

import { useAuth } from '../../hooks/useAuth';
import { usePressTap } from '../../hooks/usePressTap';
import { isAdminRole } from '../../types/Auth';

function NotFoundPage() {
  const { user } = useAuth();
  const pressTap = usePressTap();

  const homePath = !user ? '/login' : isAdminRole(user.role) ? '/dashboard/admin' : '/web-access-unavailable';
  const homeLabel = !user ? 'Back to Login' : isAdminRole(user.role) ? 'Back to Dashboard' : 'Alumni mobile app access';

  return (
    <div className="bg-app-canvas flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-outline-variant bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-fixed">
          <FileQuestion className="h-8 w-8 text-on-primary-fixed-variant" aria-hidden="true" />
        </div>

        <h1 className="text-display-md font-display-md text-on-surface">404 — Page Not Found</h1>
        <p className="mt-2 text-body-md text-on-surface-variant">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>

        <div className="mt-6">
          <MotionLink
            to={homePath}
            {...pressTap}
            className="block w-full rounded-DEFAULT bg-accent px-4 py-2 text-body-md font-label-md text-on-primary hover:bg-accent-hover"
          >
            {homeLabel}
          </MotionLink>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
