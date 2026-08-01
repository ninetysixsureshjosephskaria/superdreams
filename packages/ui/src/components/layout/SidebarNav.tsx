import type { ReactNode } from 'react';

import { cn } from '@superdreams/utils';

export interface SidebarNavProps {
  brand: ReactNode;
  isOpen: boolean;
  /** Navigation items (e.g. `<li>` with router links) supplied by the app. */
  children: ReactNode;
}

/**
 * Sidebar shell: brand header plus a navigation region. Router-aware nav items
 * are injected by the consuming app (they are app-specific), keeping this
 * component router-agnostic.
 */
export function SidebarNav({ brand, isOpen, children }: SidebarNavProps) {
  return (
    <aside
      aria-label="Primary"
      className={cn(
        'shrink-0 border-r bg-card transition-all duration-200',
        isOpen ? 'w-60' : 'w-0 overflow-hidden',
      )}
    >
      <div className="flex h-14 items-center border-b px-4 font-bold">{brand}</div>
      <nav className="p-2" aria-label="Main navigation">
        <ul className="space-y-1">{children}</ul>
      </nav>
    </aside>
  );
}
