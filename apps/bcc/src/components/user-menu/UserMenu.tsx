import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/auth';
import { ROUTES } from '@/constants';
import { useSessionStore } from '@/store';
import { Avatar, DropdownMenu, Icon } from '@superdreams/ui';

const TRIGGER_CLASS =
  'inline-flex items-center gap-2 rounded-control p-1 transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-safe:active:scale-[var(--press-scale-icon)]';

/** Admin user menu with real sign-out (revokes the server session). */
export function UserMenu() {
  const user = useSessionStore((state) => state.user);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const name = user?.name ?? 'Account';

  return (
    <DropdownMenu
      align="end"
      triggerClassName={TRIGGER_CLASS}
      trigger={
        <>
          <Avatar name={name} size="sm" />
          <span className="sr-only">Open user menu</span>
        </>
      }
      items={[
        {
          label: (
            <div className="flex flex-col">
              <span className="text-sm font-medium">{name}</span>
              {user?.email ? (
                <span className="text-xs text-muted-foreground">{user.email}</span>
              ) : null}
            </div>
          ),
          disabled: true,
        },
        {
          label: 'Settings',
          icon: <Icon name="settings" size="sm" />,
          onSelect: () => {
            navigate(ROUTES.settings);
          },
        },
        {
          label: 'Sign out',
          icon: <Icon name="log-out" size="sm" />,
          destructive: true,
          onSelect: () => {
            void logout().then(() => {
              navigate(ROUTES.login, { replace: true });
            });
          },
        },
      ]}
    />
  );
}
