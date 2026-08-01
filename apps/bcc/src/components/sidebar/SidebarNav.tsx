import { APP_NAME } from '@/constants';
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
        'hidden shrink-0 flex-col border-r bg-card transition-[width] duration-200 md:flex',
        collapsed ? 'md:w-16' : 'md:w-60',
      )}
    >
      <div
        className={cn(
          'flex h-14 items-center border-b px-3',
          collapsed ? 'justify-center' : 'gap-2',
        )}
      >
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground"
        >
          SD
        </span>
        {collapsed ? null : <span className="truncate font-semibold">{APP_NAME}</span>}
      </div>
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
