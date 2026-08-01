import { NavLink } from 'react-router-dom';

import { useNavItems } from '@/navigation';
import { useNavigationStore } from '@/store';
import { Icon } from '@superdreams/ui';
import { cn } from '@superdreams/utils';

/**
 * Mobile bottom navigation bar. Shows the primary items plus a "More" button
 * that opens the full navigation drawer. Hidden on `md` and up (the sidebar
 * takes over).
 */
export function BottomNav() {
  const primary = useNavItems()
    .filter((item) => item.primary)
    .slice(0, 4);
  const openMore = useNavigationStore((state) => state.openMobileNav);

  return (
    <nav
      aria-label="Bottom navigation"
      className="fixed inset-x-0 bottom-0 z-sticky flex border-t bg-background/95 backdrop-blur md:hidden"
    >
      {primary.map((item) => (
        <NavLink
          key={item.key}
          to={item.path}
          end={item.path === '/'}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )
          }
        >
          <Icon name={item.icon} size="sm" />
          <span>{item.label}</span>
        </NavLink>
      ))}
      <button
        type="button"
        onClick={openMore}
        aria-label="More navigation"
        className="flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <Icon name="menu" size="sm" />
        <span>More</span>
      </button>
    </nav>
  );
}
