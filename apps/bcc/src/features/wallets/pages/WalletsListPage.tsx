import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/components/page-header';
import type { WalletSortField, WalletStatus, WalletSummary } from '@superdreams/api-client';
import {
  Alert,
  Button,
  DataTable,
  Icon,
  Pagination,
  SearchBox,
  Select,
  type DataTableColumn,
  type DataTableSort,
} from '@superdreams/ui';

import { WalletStatusBadge } from '../components/WalletStatusBadge';
import { useWallets } from '../hooks';
import { formatMinor } from '../money';

const PAGE_SIZE = 10;

const STATUS_FILTER_OPTIONS = [
  { label: 'All statuses', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Suspended', value: 'SUSPENDED' },
  { label: 'Closed', value: 'CLOSED' },
];

const sortFieldByColumn: Record<string, WalletSortField> = {
  walletNumber: 'walletNumber',
  status: 'status',
  openedAt: 'openedAt',
};

/** Admin wallet list: server-side pagination, search, filter and sort. */
export default function WalletsListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState<DataTableSort>({ columnId: 'openedAt', direction: 'desc' });

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => {
      clearTimeout(timer);
    };
  }, [searchInput]);

  const query = useWallets({
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    status: status ? (status as WalletStatus) : undefined,
    sortBy: sortFieldByColumn[sort.columnId] ?? 'createdAt',
    order: sort.direction,
  });

  const columns: DataTableColumn<WalletSummary>[] = [
    {
      id: 'walletNumber',
      header: 'Wallet',
      sortable: true,
      cell: (wallet) => <span className="font-medium">{wallet.walletNumber}</span>,
    },
    { id: 'currency', header: 'Currency', cell: (wallet) => wallet.currencyCode },
    {
      id: 'available',
      header: 'Available',
      align: 'right',
      cell: (wallet) => formatMinor(wallet.balance.availableMinor, wallet.currencyCode),
    },
    {
      id: 'held',
      header: 'Held',
      align: 'right',
      cell: (wallet) => formatMinor(wallet.balance.heldMinor, wallet.currencyCode),
    },
    {
      id: 'status',
      header: 'Status',
      sortable: true,
      cell: (wallet) => <WalletStatusBadge status={wallet.status} />,
    },
    {
      id: 'openedAt',
      header: 'Opened',
      sortable: true,
      align: 'right',
      cell: (wallet) => new Date(wallet.openedAt).toLocaleDateString(),
    },
  ];

  return (
    <>
      <Helmet>
        <title>Wallets</title>
      </Helmet>
      <PageHeader
        title="Wallets"
        description="Search, filter and manage member wallets."
        actions={
          <Button leftIcon={<Icon name="plus" size="sm" />} onClick={() => navigate('/wallet/new')}>
            New wallet
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="min-w-56 flex-1">
          <SearchBox
            aria-label="Search wallets"
            placeholder="Search by wallet number or member id…"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
            }}
            onClear={() => {
              setSearchInput('');
            }}
          />
        </div>
        <div className="w-48">
          <Select
            aria-label="Filter by status"
            options={STATUS_FILTER_OPTIONS}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {query.isError ? (
        <Alert variant="destructive" title="Could not load wallets">
          {query.error.message}
        </Alert>
      ) : (
        <DataTable
          columns={columns}
          rows={query.data?.items ?? []}
          getRowId={(wallet) => wallet.id}
          isLoading={query.isPending}
          sort={sort}
          onSortChange={setSort}
          rowActions={(wallet) => (
            <Button variant="ghost" size="sm" onClick={() => navigate(`/wallet/${wallet.id}`)}>
              View
            </Button>
          )}
        />
      )}

      {query.data ? (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {query.data.total} wallet{query.data.total === 1 ? '' : 's'}
          </p>
          <Pagination
            page={query.data.page}
            pageCount={query.data.totalPages}
            onPageChange={setPage}
          />
        </div>
      ) : null}
    </>
  );
}
