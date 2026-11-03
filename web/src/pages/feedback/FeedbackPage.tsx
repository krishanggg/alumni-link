import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useFeedbackThread, useFeedbackThreadMutations, useFeedbackThreads } from '../../hooks/useFeedback';
import { useFeedbackRecipients } from '../../hooks/useFeedback';
import { useFeedbackThreadRealtime } from '../../hooks/useFeedbackRealtime';
import { useSchools } from '../../hooks/useSchools';
import type { FeedbackListFilters } from '../../types/Feedback';

import { FeedbackEmptyState } from './FeedbackEmptyState';
import { FeedbackNewThreadDialog } from './FeedbackNewThreadDialog';
import { FeedbackThreadDetailPane } from './FeedbackThreadDetailPane';
import { FeedbackThreadListPane } from './FeedbackThreadListPane';

function readConversationId(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }
  const id = Number(value);
  return id > 0 ? id : null;
}

export default function FeedbackPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<FeedbackListFilters>({ status: 'open', page: 1 });
  const [isNewThreadOpen, setIsNewThreadOpen] = useState(false);
  const selectedId = readConversationId(searchParams.get('conversation'));
  const listQuery = useFeedbackThreads(filters);
  const detailQuery = useFeedbackThread(selectedId);
  useFeedbackThreadRealtime(selectedId, closeConversation);
  const mutations = useFeedbackThreadMutations();
  const { markRead } = mutations;
  const isSchoolAdmin = user?.role === 'school_admin';
  const isSuperAdmin = user?.role === 'super_admin';
  const canCreate = isSchoolAdmin || isSuperAdmin;
  const recipientsQuery = useFeedbackRecipients(isNewThreadOpen && isSuperAdmin);
  const schoolsQuery = useSchools(isSuperAdmin);

  useEffect(() => {
    if (selectedId !== null && detailQuery.data?.unread) {
      markRead(selectedId).catch(() => undefined);
    }
  }, [detailQuery.data?.unread, markRead, selectedId]);

  function selectConversation(id: number) {
    if (selectedId === id) {
      closeConversation();
      return;
    }

    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set('conversation', String(id));
      return next;
    });
  }

  function closeConversation() {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete('conversation');
      return next;
    });
  }

  async function createThread(subject: string, body: string, schoolAdminId?: number): Promise<boolean> {
    try {
      const thread = await mutations.create({ subject, body, ...(schoolAdminId ? { school_admin_id: schoolAdminId } : {}) });
      setIsNewThreadOpen(false);
      selectConversation(thread.id);
      showToast('Feedback conversation started.');
      return true;
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to start feedback conversation.', 'error');
      return false;
    }
  }

  async function reply(body: string): Promise<boolean> {
    if (selectedId === null) {
      return false;
    }
    try {
      await mutations.reply(selectedId, body);
      return true;
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to send reply.', 'error');
      return false;
    }
  }

  async function changeStatus(action: 'resolve' | 'reopen'): Promise<boolean> {
    if (selectedId === null) {
      return false;
    }
    try {
      await (action === 'resolve' ? mutations.resolve(selectedId) : mutations.reopen(selectedId));
      if (action === 'resolve') {
        closeConversation();
      }
      showToast(action === 'resolve' ? 'Conversation resolved.' : 'Conversation reopened.');
      return true;
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update conversation.', 'error');
      return false;
    }
  }

  function updateFilters(nextFilters: FeedbackListFilters) {
    setFilters({ ...nextFilters, page: 1 });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-6">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-outline-variant/70 bg-white shadow-card lg:flex-row">
        <FeedbackThreadListPane
          threads={listQuery.data?.data ?? []}
          filters={filters}
          isLoading={listQuery.isPending}
          isFetching={listQuery.isFetching}
          error={listQuery.error instanceof Error ? listQuery.error.message : null}
          selectedId={selectedId}
          showSchool={user?.role === 'super_admin'}
          canCreate={canCreate}
          schools={schoolsQuery.schools}
          currentPage={listQuery.data?.meta?.current_page ?? filters.page ?? 1}
          lastPage={listQuery.data?.meta?.last_page ?? 1}
          onFiltersChange={updateFilters}
          onSelect={selectConversation}
          onNewThread={() => setIsNewThreadOpen(true)}
          onRetry={() => void listQuery.refetch()}
          onPageChange={(page) => setFilters((previous) => ({ ...previous, page }))}
        />
        {selectedId === null ? <FeedbackEmptyState /> : <FeedbackThreadDetailPane thread={detailQuery.data} isLoading={detailQuery.isPending} error={detailQuery.error instanceof Error ? detailQuery.error.message : null} isChangingStatus={mutations.isChangingStatus} isReplying={mutations.isReplying} onRetry={() => void detailQuery.refetch()} onResolve={() => changeStatus('resolve')} onReopen={() => changeStatus('reopen')} onReply={reply} onClose={closeConversation} showSchool={user?.role === 'super_admin'} viewerId={user?.id} />}
      </div>
      {canCreate && <FeedbackNewThreadDialog isOpen={isNewThreadOpen} isSubmitting={mutations.isCreating} isSuperAdmin={isSuperAdmin} recipients={recipientsQuery.data?.data ?? []} isRecipientsLoading={recipientsQuery.isPending} recipientsError={recipientsQuery.error instanceof Error ? recipientsQuery.error.message : null} onClose={() => setIsNewThreadOpen(false)} onSubmit={createThread} />}
    </div>
  );
}
