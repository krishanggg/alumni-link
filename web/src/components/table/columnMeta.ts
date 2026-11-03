import '@tanstack/react-table';
import type { RowData } from '@tanstack/react-table';

declare module '@tanstack/react-table' {
  // `width` is applied as an inline style on <th> and <td> so `table-fixed`
  // sizing keeps working the way the hand-rolled table sized its columns.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TData is required by the interface being augmented
  interface ColumnMeta<TData extends RowData, TValue> {
    width?: string;
  }
}
