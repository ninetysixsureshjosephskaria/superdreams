import { useNavItems } from '@/navigation';
import { useNavigationStore } from '@/store';
import { Icon, IconButton } from '@superdreams/ui';
import { cn } from '@superdreams/utils';

import { NavList } from './NavList';

/** Desktop sidebar: collapsible, config-driven, with active highlighting. */
export function SidebarNav() {
  const collapsed = useNavigationStore((state) => state.isSidebarCollapsed);
  const toggle = useNavigationStore((state) => state.toggleSidebarCollapsed);
  const items = useNavItems();

  return (
    <aside
      aria-label="Primary"
      className={cn(
        'sticky top-14 hidden h-[calc(100vh-3.5rem)] shrink-0 flex-col border-r bg-card md:flex',
        collapsed ? 'md:w-16' : 'md:w-60',
      )}
    >
      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto p-2">
        <NavList items={items} collapsed={collapsed} />
      </nav>
      <div className="border-t p-2">
        <IconButton
          label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          variant="ghost"
          size="sm"
          onClick={toggle}
          className="w-full"
        >
          <Icon name={collapsed ? 'chevron-right' : 'panel-left'} size="sm" />
        </IconButton>
      </div>
    </aside>
  );
}
