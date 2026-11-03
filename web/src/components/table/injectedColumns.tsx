import type { ColumnDef, Row, Table } from '@tanstack/react-table';

import type { RowActionsConfig } from './types';

import { ActionMenu } from '../shared/ActionMenu';
import { Checkbox } from '../shared/Checkbox';

export const SELECT_COLUMN_ID = '__select__';
export const ACTIONS_COLUMN_ID = '__actions__';

export function buildSelectColumn<T>(): ColumnDef<T, unknown> {
  return {
    id: SELECT_COLUMN_ID,
    enableSorting: false,
    enableHiding: false,
    meta: { width: '2.5rem' },
    header: ({ table }: { table: Table<T> }) => (
      <Checkbox
        label="Select all rows"
        hideLabel
        checked={table.getRowModel().rows.length > 0 && table.getIsAllRowsSelected()}
        onChange={table.getToggleAllRowsSelectedHandler()}
      />
    ),
    cell: ({ row }: { row: Row<T> }) => (
      <Checkbox
        label={`Select ${row.id}`}
        hideLabel
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
      />
    ),
  };
}

export function buildActionsColumn<T>(actions: RowActionsConfig<T>): ColumnDef<T, unknown> {
  return {
    id: ACTIONS_COLUMN_ID,
    enableSorting: false,
    enableHiding: false,
    header: () => 'Action',
    cell: ({ row }: { row: Row<T> }) => {
      if ('items' in actions) {
        return (
          <ActionMenu
            label={actions.getLabel ? actions.getLabel(row.original) : undefined}
            items={actions.items(row.original)}
          />
        );
      }

      return actions.render(row.original);
    },
  };
}
