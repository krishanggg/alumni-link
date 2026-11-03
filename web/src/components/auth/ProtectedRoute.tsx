import { Navigate } from 'react-router-dom';
import type { UserRole } from '../../types/Auth';

import { RouteLoadingFallback } from '../shared/RouteLoadingFallback';

import { ALUMNI_WEB_ENABLED } from '../../config/features';
import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireApproved?: boolean;
  allowProfileSettingsForApprovedAlumni?: boolean;
}

export function ProtectedRoute({
  children,
  allowedRoles,
  requireApproved = false,
  allowProfileSettingsForApprovedAlumni = false,
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <RouteLoadingFallback />;
  }

  if (!isAuthenticated || !user || !user.role) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'alumni' && !ALUMNI_WEB_ENABLED) {
    const hasProfileSettingsAccess =
      allowProfileSettingsForApprovedAlumni
      && user.account_status === 'approved'
      && user.is_active
      && user.alumni_archived !== true
      && user.alumni_id !== null;

    if (!hasProfileSettingsAccess) {
      return <Navigate to="/web-access-unavailable" replace />;
    }
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  if (requireApproved && user.account_status !== 'approved') {
    return <Navigate to="/web-access-unavailable" replace />;
  }

  return <>{children}</>;
}
