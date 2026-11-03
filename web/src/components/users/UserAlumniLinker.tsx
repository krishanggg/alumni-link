import { useState } from 'react';
import type { ReactNode } from 'react';
import { GraduationCap, User } from 'lucide-react';

import type { UserRole } from '../../types/Auth';

import { Avatar } from '../shared/Avatar';
import { Button } from '../shared/Button';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { HighlightedName } from '../shared/HighlightedName';
import { AlumniSearchPicker } from './AlumniSearchPicker';
import { useToast } from '../../hooks/useToast';
import { formatFullName } from '../../utils/formatName';
import { TONE_CLASSES } from '../../lib/toneClasses';

interface LinkedAlumni {
  id: number;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  suffix?: string | null;
  graduation_year: number;
}

interface UserAlumniLinkerProps {
  targetUserName: string;
  targetUserEmail: string;
  targetUserRole?: UserRole | null;
  targetAccountStatus?: 'pending' | 'approved' | 'rejected';
  currentAlumni: LinkedAlumni | null | undefined;
  onLink: (alumniId: number) => Promise<void>;
  onUnlink: () => Promise<void>;
}

function getUnlinkMessage(
  alumniName: string,
  targetUserName: string,
  targetUserRole?: UserRole | null,
  targetAccountStatus?: 'pending' | 'approved' | 'rejected',
): ReactNode {
  const preservedProfile = (
    <>Unlink <HighlightedName>{alumniName}</HighlightedName> from {targetUserName}? The alumni profile will be preserved. Only this user account’s link will be removed.</>
  );

  if (targetUserRole === 'school_admin') {
    return <>{preservedProfile} This School Admin account will keep its school association and School Admin access.</>;
  }

  if (targetUserRole === 'alumni' && targetAccountStatus === 'approved') {
    return <>{preservedProfile} Because this is an approved alumni account, its school association will also be cleared and it will lose approved alumni feature access until it completes profile setup and is re-approved.</>;
  }

  if (targetUserRole === 'alumni') {
    return <>{preservedProfile} Its school association will also be cleared, so this {targetAccountStatus ?? 'unapproved'} alumni account must complete profile setup and be approved before approved alumni features are available.</>;
  }

  return <>{preservedProfile} This non-School-Admin account’s school association will also be cleared, so it may need profile completion and approval before alumni features are available.</>;
}

export function UserAlumniLinker({
  targetUserName,
  targetUserEmail,
  targetUserRole,
  targetAccountStatus,
  currentAlumni,
  onLink,
  onUnlink,
}: UserAlumniLinkerProps) {
  const { showToast } = useToast();
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [isConfirmingUnlink, setIsConfirmingUnlink] = useState(false);
  const [error, setError] = useState('');

  async function handleUnlink() {
    setIsUnlinking(true);
    setError('');

    try {
      await onUnlink();
      setIsConfirmingUnlink(false);
      showToast('Alumni record unlinked.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to unlink';
      setError(message);
      showToast(message, 'error');
    } finally {
      setIsUnlinking(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-DEFAULT bg-surface-container-low px-3 py-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container-highest text-on-surface-variant">
          <User size={16} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-body-md font-label-md text-on-surface">{targetUserName}</p>
          <p className="truncate text-label-sm text-on-surface-variant">{targetUserEmail}</p>
        </div>
      </div>

      {currentAlumni ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-DEFAULT border border-outline-variant p-3">
            <Avatar name={`${currentAlumni.first_name} ${currentAlumni.last_name}`} sizeClassName="h-10 w-10" toneClassName={TONE_CLASSES.purple} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-body-md font-label-md text-on-surface">
                  {formatFullName(currentAlumni)}
                </p>
                <span className="inline-flex shrink-0 items-center rounded-sm bg-success-container px-2 py-0.5 text-label-sm font-label-sm text-on-success-container">
                  Linked
                </span>
              </div>
              <p className="flex items-center gap-1 text-label-sm text-on-surface-variant">
                <GraduationCap size={12} aria-hidden="true" />
                Batch {currentAlumni.graduation_year}
              </p>
            </div>
          </div>

          {isConfirmingUnlink ? (
            <ConfirmDialog
              isOpen
              title="Unlink alumni record?"
              message={getUnlinkMessage(
                formatFullName(currentAlumni),
                targetUserName,
                targetUserRole,
                targetAccountStatus,
              )}
              confirmLabel="Unlink record"
              variant="danger"
              onConfirm={handleUnlink}
              onCancel={() => {
                if (!isUnlinking) {
                  setIsConfirmingUnlink(false);
                  setError('');
                }
              }}
              isLoading={isUnlinking}
              error={error}
              onRetry={handleUnlink}
            />
          ) : (
            <Button variant="danger" onClick={() => setIsConfirmingUnlink(true)}>
              Unlink Alumni Record
            </Button>
          )}
        </div>
      ) : (
        <AlumniSearchPicker targetUserName={targetUserName} onSelect={(alumni) => onLink(alumni.id)} />
      )}
    </div>
  );
}
