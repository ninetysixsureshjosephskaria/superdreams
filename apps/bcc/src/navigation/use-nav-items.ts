import { useMemo } from 'react';

import { usePermissions } from '@/hooks/use-permissions';

import { PRIMARY_NAV } from './nav-config';
import type { NavItem } from './types';

function filterNav(items: NavItem[], can: (permission: string) => boolean): NavItem[] {
  return items
    .filter((item) => item.permission === undefined || can(item.permission))
    .map((item) => (item.children ? { ...item, children: filterNav(item.children, can) } : item));
}

/** Returns the navigation filtered by the caller's (mock) permissions. */
export function useNavItems(): NavItem[] {
  const { can } = usePermissions();
  return useMemo(() => filterNav(PRIMARY_NAV, can), [can]);
}
