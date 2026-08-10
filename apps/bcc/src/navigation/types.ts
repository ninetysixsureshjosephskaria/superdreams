import type { IconName } from '@superdreams/ui';

/** A single navigation entry. Config-driven — pages/modules never hardcode nav. */
export interface NavItem {
  key: string;
  label: string;
  path: string;
  icon: IconName;
  /**
   * Optional permission gate (RBAC-ready). `undefined` means always visible.
   * No business permissions are hardcoded in this phase; the field exists so the
   * authentication/RBAC phase can gate items without touching components.
   */
  permission?: string;
  children?: NavItem[];
}

/**
 * A labelled group of navigation items (Super Dreams IA: Overview, Members &
 * Network, Finance, Engagement, Insights, System). Purely a presentation grouping
 * — routes, labels and permissions are unchanged.
 */
export interface NavSection {
  key: string;
  label: string;
  items: NavItem[];
}
