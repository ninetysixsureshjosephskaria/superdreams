import { ROUTES } from '@/constants';
import { PRIMARY_NAV } from '@/navigation/nav-config';
import type { NavItem } from '@/navigation/types';

export interface Crumb {
  label: string;
  path: string;
  isCurrent: boolean;
}

function flatten(items: NavItem[]): NavItem[] {
  return items.flatMap((item) => (item.children ? [item, ...flatten(item.children)] : [item]));
}

const ALL_NAV_ITEMS = flatten(PRIMARY_NAV);

/** Finds the nav item whose path exactly matches. */
export function findNavItemByPath(path: string): NavItem | undefined {
  return ALL_NAV_ITEMS.find((item) => item.path === path);
}

function titleFromPath(pathname: string): string {
  const last = pathname.split('/').filter(Boolean).pop() ?? '';
  return last.replace(/-/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

/**
 * Builds the breadcrumb trail for a pathname. Home is always the root; a matched
 * nav item supplies the label, otherwise it is derived from the path.
 */
export function buildBreadcrumbs(pathname: string): Crumb[] {
  const crumbs: Crumb[] = [
    { label: 'Home', path: ROUTES.home, isCurrent: pathname === ROUTES.home },
  ];
  if (pathname === ROUTES.home) {
    return crumbs;
  }
  const match = findNavItemByPath(pathname);
  crumbs.push({ label: match?.label ?? titleFromPath(pathname), path: pathname, isCurrent: true });
  return crumbs;
}
