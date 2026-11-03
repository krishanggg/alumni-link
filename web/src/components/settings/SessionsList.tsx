import { useState } from 'react';
import { Monitor, Smartphone, LogOut } from 'lucide-react';
import type { SessionItem } from '../../types/Profile';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { HighlightedName } from '../shared/HighlightedName';
import { useToast } from '../../hooks/useToast';

interface SessionsListProps {
  sessions: SessionItem[];
  onTerminate: (id: string) => Promise<void>;
  onTerminateAll: () => Promise<void>;
  isLoading?: boolean;
}

type ConfirmationTarget =
  | { kind: 'session'; session: SessionItem }
  | { kind: 'all'; count: number };

export function SessionsList({ sessions, onTerminate, onTerminateAll, isLoading = false }: SessionsListProps) {
  const { showToast } = useToast();
  const [confirmationTarget, setConfirmationTarget] = useState<ConfirmationTarget | null>(null);
  const [pendingTarget, setPendingTarget] = useState<ConfirmationTarget | null>(null);
  const [actionError, setActionError] = useState('');

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-12 rounded-DEFAULT bg-surface-container" />
        ))}
      </div>
    );
  }

  const webSessions = sessions.filter((s) => s.type === 'web');
  const mobileSessions = sessions.filter((s) => s.type === 'mobile');
  const otherSessions = sessions.filter((s) => !s.is_current);
  const hasOtherSessions = otherSessions.length > 0;

  async function executeAction() {
    if (!confirmationTarget) {
      return;
    }

    const target = confirmationTarget;
    setPendingTarget(target);
    setActionError('');

    try {
      if (target.kind === 'all') {
        await onTerminateAll();
        showToast('All other sessions terminated.');
      } else {
        await onTerminate(target.session.id);
        showToast('Session terminated.');
      }
      setConfirmationTarget(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update sessions. Please try again.';
      setActionError(message);
      showToast(message, 'error');
    } finally {
      setPendingTarget(null);
    }
  }

  if (sessions.length === 0) {
    return <p className="text-body-md text-on-surface-variant">No active sessions found.</p>;
  }

  return (
    <div>
      {webSessions.length > 0 && (
        <div className="mb-4">
          <h3 className="text-overline font-overline text-on-surface-variant uppercase">
            Web Sessions
          </h3>
          <SessionGroup
            sessions={webSessions}
            onTerminate={(session) => {
              setActionError('');
              setConfirmationTarget({ kind: 'session', session });
            }}
            disabled={confirmationTarget !== null || pendingTarget !== null}
            icon={Monitor}
          />
        </div>
      )}
      {mobileSessions.length > 0 && (
        <div className="mb-4">
          <h3 className="text-overline font-overline text-on-surface-variant uppercase">
            Mobile Sessions
          </h3>
          <SessionGroup
            sessions={mobileSessions}
            onTerminate={(session) => {
              setActionError('');
              setConfirmationTarget({ kind: 'session', session });
            }}
            disabled={confirmationTarget !== null || pendingTarget !== null}
            icon={Smartphone}
          />
        </div>
      )}
      {hasOtherSessions && (
        <button
          type="button"
          onClick={() => {
            setActionError('');
            setConfirmationTarget({ kind: 'all', count: otherSessions.length });
          }}
          disabled={confirmationTarget !== null || pendingTarget !== null}
          className="mt-3 flex items-center gap-1.5 rounded-DEFAULT border border-error/30 px-4 py-2 text-body-md font-label-md text-error transition-colors hover:bg-error-container"
        >
          <LogOut size={15} aria-hidden="true" />
          Sign out all other sessions
        </button>
      )}

      <ConfirmDialog
        isOpen={confirmationTarget !== null}
        title={confirmationTarget?.kind === 'all'
          ? `Sign out ${confirmationTarget.count} other session${confirmationTarget.count === 1 ? '' : 's'}?`
          : <>Terminate <HighlightedName>{confirmationTarget?.session.device_name || 'this session'}</HighlightedName>?</>}
        message={confirmationTarget?.kind === 'all'
          ? 'You will remain signed in on this device. All other web sessions and mobile tokens will be signed out, and remembered-device auto-login will be revoked.'
          : 'The selected device/session will be signed out and removed from your active-session list. Your current session will stay active.'}
        confirmLabel={confirmationTarget?.kind === 'all' ? 'Sign out all' : 'Terminate'}
        variant="danger"
        onConfirm={() => { void executeAction(); }}
        onCancel={() => {
          if (pendingTarget === null) {
            setConfirmationTarget(null);
            setActionError('');
          }
        }}
        isLoading={pendingTarget !== null}
        error={actionError}
        onRetry={() => { void executeAction(); }}
      />
    </div>
  );
}

function SessionGroup({
  sessions,
  onTerminate,
  disabled,
  icon: Icon,
}: {
  sessions: SessionItem[];
  onTerminate: (session: SessionItem) => void;
  disabled: boolean;
  icon: typeof Monitor;
}) {
  if (sessions.length === 0) {
    return null;
  }

  return (
    <ul className="mt-2 divide-y divide-outline-variant/70">
      {sessions.map((session) => (
        <li key={session.id} className="flex items-center justify-between gap-3 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant">
              <Icon size={16} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-body-md text-on-surface">
                {session.device_name || 'Web Session'}
                {session.is_current && (
                  <span className="rounded-full bg-success-container px-2 py-0.5 text-label-sm font-label-sm text-on-success-container">Current</span>
                )}
              </p>
              <p className="truncate text-label-sm text-on-surface-variant">
                {session.ip_address || 'Unknown IP'} &bull; Last active: {new Date(session.last_activity).toLocaleString()}
              </p>
            </div>
          </div>
          {!session.is_current && (
            <button
              type="button"
              onClick={() => onTerminate(session)}
              disabled={disabled}
              className="shrink-0 rounded-DEFAULT px-3 py-1.5 text-label-sm font-label-sm text-error transition-colors hover:bg-error-container"
            >
              Terminate
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
