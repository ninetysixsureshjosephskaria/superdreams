import { useLocation } from 'react-router-dom';

import { buildBreadcrumbs, type Crumb } from '@/utils';

/** Derives the breadcrumb trail for the current location from the nav config. */
export function useBreadcrumbs(): Crumb[] {
  const { pathname } = useLocation();
  return buildBreadcrumbs(pathname);
}
