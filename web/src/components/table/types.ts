import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { ActionMenuItem } from '../shared/ActionMenu';

export interface BulkAction<T> {
  label: string;
  variant?: 'default' | 'danger';
  icon?: LucideIcon;
  action: (rows: T[]) => Promise<void>;
}

/**
 * Either a menu of per-row actions (rendered via the built-in ActionMenu), or a
 * fully custom cell renderer. The two are mutually exclusive.
 */
export type RowActionsConfig<T> =
  | { items: (row: T) => ActionMenuItem[]; getLabel?: (row: T) => string }
  | { render: (row: T) => ReactNode };

export interface EmptyStateConfig {
  title: string;
  description?: string;
  icon?: LucideIcon;
}
