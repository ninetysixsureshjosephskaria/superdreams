import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@/constants';
import { useNotificationStore, useSessionStore } from '@/store';
import { Avatar, DropdownMenu, Icon } from '@superdreams/ui';

const TRIGGER_CLASS =
  'inline-flex items-center gap-2 rounded-md p-1 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/**
 * Member profile menu. Sign-out is mocked (it clears the mock session and shows
 * a toast) — no real authentication is performed in this phase.
 */
export function ProfileMenu() {
  const user = useSessionStore((state) => state.user);
  const clear = useSessionStore((state) => state.clear);
  const notify = useNotificationStore((state) => state.notify);
  const navigate = useNavigate();

  const name = user?.name ?? 'Account';

  return (
    <DropdownMenu
      align="end"
      triggerClassName={TRIGGER_CLASS}
      trigger={
        <>
          <Avatar name={name} size="sm" />
          <span className="sr-only">Open profile menu</span>
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
          label: 'My profile',
          icon: <Icon name="user" size="sm" />,
          onSelect: () => {
            navigate(ROUTES.profile);
          },
        },
        {
          label: 'Sign out',
          icon: <Icon name="log-out" size="sm" />,
          destructive: true,
          onSelect: () => {
            clear();
            notify({
              variant: 'info',
              title: 'Signed out (mock)',
              description: 'Authentication is not wired in this phase.',
            });
          },
        },
      ]}
    />
  );
}
