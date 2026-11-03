import { useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { Modal } from './Modal';
import { Button } from './Button';
import { acknowledgeSessionExpired, isSessionExpired, subscribeSessionExpired } from '../../lib/sessionExpiredSignal';

/**
 * Non-dismissible by design (`dismissible={false}`) — a dead session must
 * not be mistaken for an ordinary banner the user can click past. The only
 * way out is the explicit "Go to login" action.
 *
 * The current page is deliberately left alone (blurred behind the backdrop,
 * not redirected) until that action fires: clearing `user` up front would
 * make `ProtectedRoute` bounce to /login on its own, so the user would land
 * on the login page before ever reading a modal that tells them to go there.
 */
export function SessionExpiredModal() {
  const isOpen = useSyncExternalStore(subscribeSessionExpired, isSessionExpired);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleGoToLogin() {
    setIsSigningOut(true);
    await logout();
    acknowledgeSessionExpired();
    navigate('/login', { replace: true });
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      dismissible={false}
      title="Your session has expired"
      icon={LockKeyhole}
      tone="red"
      size="sm"
      footer={
        <Button onClick={handleGoToLogin} autoFocus isLoading={isSigningOut} loadingText="Signing out">
          Go to login
        </Button>
      }
    >
      <p className="text-body-md text-on-surface-variant">
        For your security, you&apos;ve been signed out. Please log in again to continue.
      </p>
    </Modal>
  );
}
