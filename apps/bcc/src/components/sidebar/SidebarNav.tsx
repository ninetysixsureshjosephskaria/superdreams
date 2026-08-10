import { APP_NAME } from '@/constants';
import { useNavSections } from '@/navigation';
import { useNavigationStore } from '@/store';
import { Icon, IconButton } from '@superdreams/ui';
import { cn } from '@superdreams/utils';

import { NavList } from './NavList';

/** Desktop sidebar: collapsible, grouped (Super Dreams IA), with active highlighting. */
export function SidebarNav() {
  const collapsed = useNavigationStore((state) => state.isSidebarCollapsed);
  const toggle = useNavigationStore((state) => state.toggleSidebarCollapsed);
  const sections = useNavSections();

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
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground"
        >
          SD
        </span>
        {collapsed ? null : (
          <span className="truncate font-semibold tracking-tight">{APP_NAME}</span>
        )}
      </div>
      <nav aria-label="Main navigation" className="flex-1 space-y-4 overflow-y-auto p-3">
        {sections.map((section) => (
          <div key={section.key} className="space-y-1">
            {collapsed ? (
              <div aria-hidden="true" className="mx-2 my-1 h-px bg-border first:hidden" />
            ) : (
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                {section.label}
              </p>
            )}
            <NavList items={section.items} collapsed={collapsed} />
          </div>
        ))}
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
