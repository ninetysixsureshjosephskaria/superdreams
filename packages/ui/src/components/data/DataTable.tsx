import type { ReactNode } from 'react';

import { cn } from '@superdreams/utils';

import { Checkbox } from '../common/Checkbox';
import { EmptyState } from '../feedback/EmptyState';
import { Spinner } from '../feedback/Spinner';
import { Icon, type IconName } from '../icons';

export type SortDirection = 'asc' | 'desc';

export interface DataTableSort {
  columnId: string;
  direction: SortDirection;
}

export interface DataTableColumn<TRow> {
  id: string;
  header: ReactNode;
  cell: (row: TRow) => ReactNode;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

export interface DataTableProps<TRow> {
  columns: DataTableColumn<TRow>[];
  rows: TRow[];
  getRowId: (row: TRow) => string;
  isLoading?: boolean;
  emptyState?: ReactNode;
  /** Controlled sort state + change handler. */
  sort?: DataTableSort;
  onSortChange?: (sort: DataTableSort) => void;
  /** Controlled row selection. */
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  /** Optional per-row actions rendered in a trailing column. */
  rowActions?: (row: TRow) => ReactNode;
  className?: string;
}

const alignClasses = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
} as const;

function sortIcon(active: boolean, direction: SortDirection): IconName {
  if (!active) {
    return 'chevrons-up-down';
  }
  return direction === 'asc' ? 'chevron-up' : 'chevron-down';
}

/**
 * Presentation-only data table. Sorting, selection and pagination are fully
 * controlled — the table renders state and emits change events but never fetches
 * or mutates data.
 */
export function DataTable<TRow>({
  columns,
  rows,
  getRowId,
  isLoading = false,
  emptyState,
  sort,
  onSortChange,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  rowActions,
  className,
}: DataTableProps<TRow>) {
  const columnCount = columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0);
  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.includes(getRowId(row)));

  const toggleAll = (): void => {
    if (!onSelectionChange) {
      return;
    }
    onSelectionChange(allSelected ? [] : rows.map(getRowId));
  };

  const toggleRow = (id: string): void => {
    if (!onSelectionChange) {
      return;
    }
    onSelectionChange(
      selectedIds.includes(id)
        ? selectedIds.filter((current) => current !== id)
        : [...selectedIds, id],
    );
  };

  const changeSort = (columnId: string): void => {
    if (!onSortChange) {
      return;
    }
    const direction: SortDirection =
      sort?.columnId === columnId && sort.direction === 'asc' ? 'desc' : 'asc';
    onSortChange({ columnId, direction });
  };

  return (
    <div className={cn('w-full overflow-x-auto rounded-card border', className)}>
      <table className="w-full caption-bottom text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            {selectable ? (
              <th scope="col" className="w-10 px-3 py-3">
                <Checkbox checked={allSelected} onChange={toggleAll} aria-label="Select all rows" />
              </th>
            ) : null}
            {columns.map((column) => {
              const active = sort?.columnId === column.id;
              const ariaSort = active
                ? sort.direction === 'asc'
                  ? 'ascending'
                  : 'descending'
                : column.sortable
                  ? 'none'
                  : undefined;
              return (
                <th
                  key={column.id}
                  scope="col"
                  aria-sort={ariaSort}
                  className={cn(
                    'px-4 py-3 font-medium text-muted-foreground',
                    alignClasses[column.align ?? 'left'],
                    column.className,
                  )}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => {
                        changeSort(column.id);
                      }}
                      className="inline-flex items-center gap-1 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {column.header}
                      <Icon name={sortIcon(active, sort?.direction ?? 'asc')} size="xs" />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
            {rowActions ? (
              <th scope="col" className="px-4 py-3 text-right">
                <span className="sr-only">Actions</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody className="divide-y">
          {isLoading ? (
            <tr>
              <td colSpan={columnCount} className="px-4 py-10">
                <div className="flex justify-center">
                  <Spinner label="Loading data" />
                </div>
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columnCount} className="px-4 py-10">
                {emptyState ?? (
                  <EmptyState title="No results" description="There is nothing to show yet." />
                )}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const id = getRowId(row);
              const selected = selectedIds.includes(id);
              return (
                <tr
                  key={id}
                  data-selected={selected || undefined}
                  className="transition-colors hover:bg-muted/40 data-[selected]:bg-accent/40"
                >
                  {selectable ? (
                    <td className="w-10 px-3 py-3">
                      <Checkbox
                        checked={selected}
                        onChange={() => {
                          toggleRow(id);
                        }}
                        aria-label="Select row"
                      />
                    </td>
                  ) : null}
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={cn(
                        'px-4 py-3',
                        alignClasses[column.align ?? 'left'],
                        column.className,
                      )}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                  {rowActions ? <td className="px-4 py-3 text-right">{rowActions(row)}</td> : null}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
