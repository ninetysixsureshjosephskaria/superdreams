import type { FinancialRequestStatus, FinancialRequestType } from '@superdreams/api-client';
import { formatCurrency } from '@superdreams/utils';

/** Formats integer USD cents as a currency string. */
export function usd(cents: number): string {
  return formatCurrency(cents / 100, 'USD');
}

/** Whether a request can still be actioned (matches the backend `assertActionable`). */
export function isActionable(status: FinancialRequestStatus): boolean {
  return status === 'PENDING' || status === 'HOLD';
}

/** The RBAC permission required to decide a request of the given type. */
export function decidePermission(type: FinancialRequestType): string {
  return type === 'DEPOSIT' ? 'deposits.approve' : 'withdrawals.approve';
}
