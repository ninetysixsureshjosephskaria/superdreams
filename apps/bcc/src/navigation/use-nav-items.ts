import { useMemo } from 'react';

import { usePermissions } from '@/hooks/use-permissions';

import { PRIMARY_NAV, PRIMARY_NAV_SECTIONS } from './nav-config';
import type { NavItem, NavSection } from './types';

function filterNav(items: NavItem[], can: (permission: string) => boolean): NavItem[] {
  return items
    .filter((item) => item.permission === undefined || can(item.permission))
    .map((item) => (item.children ? { ...item, children: filterNav(item.children, can) } : item));
}

/** Returns the flat navigation filtered by the caller's permissions. */
export function useNavItems(): NavItem[] {
  const { can } = usePermissions();
  return useMemo(() => filterNav(PRIMARY_NAV, can), [can]);
}

/**
 * Returns the grouped navigation, permission-filtered. Empty sections (all items
 * gated out) are dropped so the sidebar never renders a header with no links.
 */
export function useNavSections(): NavSection[] {
  const { can } = usePermissions();
  return useMemo(
    () =>
      PRIMARY_NAV_SECTIONS.map((section) => ({
        ...section,
        items: filterNav(section.items, can),
      })).filter((section) => section.items.length > 0),
    [can],
  );
}
