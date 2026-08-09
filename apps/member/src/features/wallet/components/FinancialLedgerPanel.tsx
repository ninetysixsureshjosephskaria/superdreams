import { useState } from 'react';

import type { TransactionType } from '@superdreams/api-client';

import { useMyFinancialTransactions } from '../hooks';
import { TransactionsTable } from './TransactionsTable';

const PAGE_SIZE = 10;

/** The FINANCIAL wallet ledger (deposits, withdrawals, profit, commission, fees…). */
export function FinancialLedgerPanel() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const query = useMyFinancialTransactions({
    page,
    pageSize: PAGE_SIZE,
    type: type ? (type as TransactionType) : undefined,
  });

  return (
    <TransactionsTable
      query={query}
      type={type}
      onTypeChange={(next) => {
        setType(next);
        setPage(1);
      }}
      onPageChange={setPage}
    />
  );
}
