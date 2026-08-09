import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { walletApi } from '@/features/wallet';
import type { ApiError, PaginatedTransactions } from '@superdreams/api-client';

import { earningsKeys } from './query-keys';

/** Max page the wallet transactions endpoint allows. */
const LEDGER_PAGE_SIZE = 100;

/**
 * The member's earnings ledger — CREDIT entries from their FINANCIAL wallet. The
 * backend has no member earnings API, so this reuses the authorised financial
 * ledger endpoint (`GET /wallets/me/transactions?kind=FINANCIAL`) and the page
 * categorises the credits by their backend reference. One page (up to 100 most
 * recent credits) is fetched; the page surfaces a note if more exist.
 */
export function useMyEarningsLedger(): UseQueryResult<PaginatedTransactions, ApiError> {
  return useQuery({
    queryKey: earningsKeys.ledger,
    queryFn: () =>
      walletApi.listMyTransactions(
        { page: 1, pageSize: LEDGER_PAGE_SIZE, type: 'CREDIT' },
        'FINANCIAL',
      ),
  });
}
