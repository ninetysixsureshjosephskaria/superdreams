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
