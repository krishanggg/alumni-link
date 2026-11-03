import { useState, useEffect, useCallback, useRef } from 'react';
import { Download, ScrollText, User, Activity } from 'lucide-react';

import { useDebouncedValue } from '../../hooks/useDebouncedValue';

import type { ActivityLogEntry } from '../../types/Profile';

import { DataTable, DataTableSearch, createColumnHelper } from '../../components/table';
import { SettingsLayout } from '../../components/settings/SettingsLayout';
import { SelectField } from '../../components/shared/SelectField';
import { DateRangeField } from '../../components/shared/DateRangeField';
import { Button } from '../../components/shared/Button';

import { SystemService } from '../../services/SystemService';

import { formatActivityKey } from '../../lib/reportMeta';

const chLog = createColumnHelper<ActivityLogEntry>();

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const hasLoadedOnce = useRef(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [actionOptions, setActionOptions] = useState<string[]>([]);
  const [userOptions, setUserOptions] = useState<{ id: number; name: string }[]>([]);

  // `search` is already the debounced commit from DataTableSearch.
  const debouncedDateFrom = useDebouncedValue(dateFrom, 300);
  const debouncedDateTo = useDebouncedValue(dateTo, 300);

  const loadLogs = useCallback(async () => {
    if (hasLoadedOnce.current) {
      setIsFetching(true);
    } else {
      setIsLoading(true);
    }
    setError('');

    try {
      const params: Record<string, string | number> = { page, per_page: 20 };
      if (search) {
        params.search = search;
      }
      if (actionFilter) {
        params.action = actionFilter;
      }
      if (debouncedDateFrom) {
        params.date_from = debouncedDateFrom;
      }
      if (debouncedDateTo) {
        params.date_to = debouncedDateTo;
      }
      if (userFilter) {
        params.user_id = parseInt(userFilter, 10);
      }

      const data = await SystemService.fetchActivityLogs(params);
      setLogs(data.data);
      setTotalPages(data.last_page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity logs');
    } finally {
      hasLoadedOnce.current = true;
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [page, search, actionFilter, debouncedDateFrom, debouncedDateTo, userFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    SystemService.fetchActivityLogActions()
      .then((data) => setActionOptions(data.actions))
      .catch(() => setActionOptions([]));

    SystemService.fetchActivityLogUsers()
      .then((data) => setUserOptions(data.users))
      .catch(() => setUserOptions([]));
  }, []);

  function handleExport() {
    const params = new URLSearchParams();
    if (search) {
      params.set('search', search);
    }
    if (actionFilter) {
      params.set('action', actionFilter);
    }
    if (debouncedDateFrom) {
      params.set('date_from', debouncedDateFrom);
    }
    if (debouncedDateTo) {
      params.set('date_to', debouncedDateTo);
    }
    if (userFilter) {
      params.set('user_id', userFilter);
    }

    const url = `/api/system/activity-logs/export${params.toString() ? `?${params.toString()}` : ''}`;
    window.open(url, '_blank');
  }

  const columns = [
    chLog.accessor('created_at', {
      header: 'Date & Time',
      cell: ({ getValue }) => new Date(getValue()).toLocaleString(),
    }),
    chLog.accessor('user', { header: 'User' }),
    chLog.accessor('action', {
      header: 'Activity',
      cell: ({ getValue }) => (
        <span className="inline-block whitespace-nowrap rounded-full bg-accent/10 px-2.5 py-0.5 text-label-sm font-label-sm text-accent">
          {formatActivityKey(getValue())}
        </span>
      ),
    }),
    chLog.accessor('description', {
      header: 'Description',
      cell: ({ getValue }) => getValue() || '\u2014',
    }),
    chLog.accessor('ip_address', {
      header: 'IP Address',
      cell: ({ getValue }) => getValue() || '\u2014',
    }),
  ];

  return (
    <SettingsLayout fillHeight>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between">
          <h2 className="text-headline-sm font-headline-sm text-on-surface">Audit Logs</h2>
          <Button variant="ghost" icon={Download} onClick={handleExport} className="border border-accent">
            Export Logs
          </Button>
        </div>

        {error && (
          <div className="mt-4 shrink-0 rounded-DEFAULT bg-error-container p-3 text-body-md text-on-error-container" role="alert">
            {error}
          </div>
        )}

        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <DataTable
            id="audit-logs-super-admin-table"
            columns={columns}
            data={logs}
            getRowId={(row) => String(row.id)}
            isLoading={isLoading}
            isFetching={isFetching}
            paginated
            fillHeight
            columnVisibility
            appearance="flat"
            toolbarLayout="stacked"
            emptyState={{ icon: ScrollText, title: 'No activity logs found', description: 'Try adjusting your filters.' }}
            toolbarTop={
              <DataTableSearch
                value={search}
                onChange={setSearch}
                placeholder="Search the activity log"
                ariaLabel="Search activities"
                appearance="flat"
                isFetching={isFetching}
              />
            }
            toolbar={
              <>
                <SelectField
                  label="Filter by user"
                  hideLabel
                  icon={User}
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  appearance="command"
                >
                  <option value="">All users</option>
                  {userOptions.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  label="Filter by activity"
                  hideLabel
                  icon={Activity}
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  appearance="command"
                >
                  <option value="">All activities</option>
                  {actionOptions.map((action) => (
                    <option key={action} value={action}>
                      {formatActivityKey(action)}
                    </option>
                  ))}
                </SelectField>
                <DateRangeField
                  appearance="command"
                  from={dateFrom}
                  to={dateTo}
                  onChangeFrom={setDateFrom}
                  onChangeTo={setDateTo}
                />
              </>
            }
            manual={{
              pageCount: totalPages,
              pageIndex: page - 1,
              onPageChange: (pageIndex) => setPage(pageIndex + 1),
            }}
          />
        </div>
      </div>
    </SettingsLayout>
  );
}
