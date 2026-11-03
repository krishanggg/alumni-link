import { LogOut, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/shared/Button';

function WebAccessUnavailablePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const isAdminAccount = user?.role === 'super_admin' || user?.role === 'school_admin';

  return (
    <div className="bg-app-canvas flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-lg border border-outline-variant bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-container">
          <Smartphone className="h-8 w-8 text-on-primary" aria-hidden="true" />
        </div>
        <h1 className="text-display-md font-display-md text-on-surface">
          {isAdminAccount ? 'Admin web access unavailable' : 'Use the AlumniLink mobile app'}
        </h1>
        <p className="mt-2 text-body-md text-on-surface-variant">
          {isAdminAccount
            ? 'This administrator account is not approved for the client web portal. Contact your system administrator.'
            : 'Approved alumni with an active, linked record can access Profile Settings on web. Other alumni features are available in the AlumniLink mobile app.'}
        </p>
        <Button type="button" variant="secondary" onClick={() => { void handleLogout(); }} className="mt-6">
          <LogOut size={16} aria-hidden="true" />
          Return to login
        </Button>
      </div>
    </div>
  );
}

export default WebAccessUnavailablePage;
