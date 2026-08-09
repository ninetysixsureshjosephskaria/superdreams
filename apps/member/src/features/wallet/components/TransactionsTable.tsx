import type { UseQueryResult } from '@tanstack/react-query';

import type {
  ApiError,
  PaginatedTransactions,
  TransactionType,
  WalletTransactionData,
} from '@superdreams/api-client';
import {
  Alert,
  Badge,
  DataTable,
  Pagination,
  Select,
  type BadgeVariant,
  type DataTableColumn,
} from '@superdreams/ui';

import { formatMinor } from '../money';

const TYPE_FILTER_OPTIONS = [
  { label: 'All types', value: '' },
  { label: 'Credit', value: 'CREDIT' },
  { label: 'Debit', value: 'DEBIT' },
  { label: 'Adjustment', value: 'ADJUSTMENT' },
  { label: 'Hold', value: 'HOLD' },
  { label: 'Release', value: 'RELEASE' },
];

const variantByType: Record<TransactionType, BadgeVariant> = {
  CREDIT: 'success',
  RELEASE: 'success',
  DEBIT: 'destructive',
  HOLD: 'warning',
  ADJUSTMENT: 'secondary',
  REVERSAL: 'outline',
};

const columns: DataTableColumn<WalletTransactionData>[] = [
  {
    id: 'type',
    header: 'Type',
    cell: (txn) => (
      <Badge variant={variantByType[txn.type]}>
        {txn.type.charAt(0) + txn.type.slice(1).toLowerCase()}
      </Badge>
    ),
  },
  {
    id: 'amount',
    header: 'Amount',
    align: 'right',
    cell: (txn) =>
      `${txn.direction === 'DEBIT' ? '-' : '+'}${formatMinor(txn.amountMinor, txn.currencyCode)}`,
  },
  {
    id: 'balance',
    header: 'Balance',
    align: 'right',
    cell: (txn) => formatMinor(txn.availableAfterMinor, txn.currencyCode),
  },
  {
    id: 'date',
    header: 'Date',
    align: 'right',
    cell: (txn) => new Date(txn.createdAt).toLocaleString(),
  },
];

interface TransactionsTableProps {
  query: UseQueryResult<PaginatedTransactions, ApiError>;
  type: string;
  onTypeChange: (type: string) => void;
  onPageChange: (page: number) => void;
}

/**
 * Presentational wallet-ledger table (type filter + paginated rows). Shared by the
 * loyalty and financial ledgers — the caller supplies the query and paging state so
 * each wallet keeps its own data source.
 */
export function TransactionsTable({
  query,
  type,
  onTypeChange,
  onPageChange,
}: TransactionsTableProps) {
  return (
    <div className="space-y-4">
      <div className="w-48">
        <Select
          aria-label="Filter by type"
          options={TYPE_FILTER_OPTIONS}
          value={type}
          onChange={(event) => onTypeChange(event.target.value)}
        />
      </div>
      {query.isError ? (
        <Alert variant="destructive" title="Could not load transactions">
          {query.error.message}
        </Alert>
      ) : (
        <DataTable
          columns={columns}
          rows={query.data?.items ?? []}
          getRowId={(txn) => txn.id}
          isLoading={query.isPending}
        />
      )}
      {query.data ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{query.data.total} transactions</p>
          <Pagination
            page={query.data.page}
            pageCount={query.data.totalPages}
            onPageChange={onPageChange}
          />
        </div>
      ) : null}
    </div>
  );
}
