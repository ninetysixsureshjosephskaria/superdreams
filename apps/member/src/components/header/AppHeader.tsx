import { NotificationsMenu } from '@/components/notifications';
import { ProfileMenu } from '@/components/profile-menu';
import { APP_NAME } from '@/constants';
import { useTheme } from '@/hooks';
import { Icon, IconButton } from '@superdreams/ui';

/** Sticky member header: brand, notifications, theme switch, profile menu. */
export function AppHeader() {
  const { resolvedTheme, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-sticky flex h-14 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur sm:px-4">
      <span className="flex min-w-0 items-center gap-2">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground"
        >
          SD
        </span>
        <span className="hidden truncate font-semibold sm:inline">{APP_NAME}</span>
      </span>

      <div className="ml-auto flex items-center gap-1">
        <NotificationsMenu />
        <IconButton
          label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
          variant="ghost"
          size="sm"
          onClick={toggle}
        >
          <Icon name={resolvedTheme === 'dark' ? 'sun' : 'moon'} size="sm" />
        </IconButton>
        <ProfileMenu />
      </div>
    </header>
  );
}
