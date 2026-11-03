type Listener = () => void;

// Tracks whether the app currently believes it has an authenticated session,
// so a 401 can be told apart from "not logged in yet" (initial /me check,
// a failed login attempt) versus "was logged in and the session just died".
let authenticated = false;
let expired = false;
const listeners = new Set<Listener>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function markAuthenticated(): void {
  authenticated = true;
  expired = false;
}

export function markSignedOut(): void {
  authenticated = false;
  expired = false;
}

/** Call when an API response comes back 401. No-ops unless a session was actually active. */
export function reportUnauthorizedResponse(): void {
  if (!authenticated || expired) {
    return;
  }

  authenticated = false;
  expired = true;
  emit();
}

/** Call once the user has acknowledged the expiry (e.g. clicked "Go to login"). */
export function acknowledgeSessionExpired(): void {
  if (!expired) {
    return;
  }

  expired = false;
  emit();
}

export function subscribeSessionExpired(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isSessionExpired(): boolean {
  return expired;
}
