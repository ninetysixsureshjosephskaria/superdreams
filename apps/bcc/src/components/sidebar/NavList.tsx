import { NavLink } from 'react-router-dom';

import type { NavItem } from '@/navigation';
import { Icon } from '@superdreams/ui';
import { cn } from '@superdreams/utils';

interface NavListProps {
  items: NavItem[];
  /** Icon-only (collapsed) rendering. */
  collapsed?: boolean;
  /** Invoked after navigating (e.g. to close the mobile drawer). */
  onNavigate?: () => void;
}

/** Renders navigation links from config. Shared by the sidebar and mobile drawer. */
export function NavList({ items, collapsed = false, onNavigate }: NavListProps) {
  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item.key}>
          <NavLink
            to={item.path}
            end={item.path === '/'}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                collapsed && 'justify-center px-2',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )
            }
          >
            <Icon name={item.icon} size="sm" className="shrink-0" />
            {collapsed ? (
              <span className="sr-only">{item.label}</span>
            ) : (
              <span className="truncate">{item.label}</span>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}
