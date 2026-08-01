import { NotificationsMenu } from '@/components/notifications';
import { QuickActions } from '@/components/quick-actions';
import { GlobalSearch } from '@/components/search';
import { UserMenu } from '@/components/user-menu';
import { useTheme } from '@/hooks';
import { useNavigationStore } from '@/store';
import { Icon, IconButton } from '@superdreams/ui';

/** Sticky application header: nav toggles, search, quick actions, notifications, theme, user. */
export function AppHeader() {
  const openMobileNav = useNavigationStore((state) => state.openMobileNav);
  const toggleCollapsed = useNavigationStore((state) => state.toggleSidebarCollapsed);
  const { resolvedTheme, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-sticky flex h-14 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur sm:px-4">
      <IconButton
        label="Open navigation"
        variant="ghost"
        size="sm"
        className="md:hidden"
        onClick={openMobileNav}
      >
        <Icon name="menu" size="sm" />
      </IconButton>
      <IconButton
        label="Toggle sidebar"
        variant="ghost"
        size="sm"
        className="hidden md:inline-flex"
        onClick={toggleCollapsed}
      >
        <Icon name="panel-left" size="sm" />
      </IconButton>

      <div className="hidden flex-1 md:block">
        <GlobalSearch />
      </div>

      <div className="flex flex-1 items-center justify-end gap-1 md:flex-none">
        <QuickActions />
        <NotificationsMenu />
        <IconButton
          label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
          variant="ghost"
          size="sm"
          onClick={toggle}
        >
          <Icon name={resolvedTheme === 'dark' ? 'sun' : 'moon'} size="sm" />
        </IconButton>
        <UserMenu />
      </div>
    </header>
  );
}
