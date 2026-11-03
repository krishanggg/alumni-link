import { useLocation, useNavigate } from 'react-router-dom';

interface ReturnState {
  returnTo?: string;
  returnLabel?: string;
}

// Captures the current page as a "return to" target, for pages that link
// out to a deep-linked entity view (e.g. Dashboard -> a report preview).
export function useReturnState(returnLabel?: string): ReturnState {
  const location = useLocation();
  return {
    returnTo: `${location.pathname}${location.search}`,
    returnLabel,
  };
}

// Reads back a "return to" target set by useReturnState, for pages that
// were navigated to via a deep link and want to offer a way back.
export function useReturnTo() {
  const location = useLocation();
  const navigate = useNavigate();
  const { returnTo, returnLabel } = (location.state as ReturnState | null) ?? {};

  return {
    returnTo,
    returnLabel,
    goBack: returnTo ? () => navigate(returnTo) : undefined,
  };
}
