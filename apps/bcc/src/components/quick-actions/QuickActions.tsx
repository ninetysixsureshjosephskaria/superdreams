import { useNotificationStore } from '@/store';
import { DropdownMenu, Icon } from '@superdreams/ui';

const TRIGGER_CLASS =
  'inline-flex h-8 w-8 items-center justify-center rounded-control text-muted-foreground transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-safe:active:scale-[var(--press-scale-icon)]';

/** Header quick-actions menu. Actions are mocked (they arrive with their modules). */
export function QuickActions() {
  const notify = useNotificationStore((state) => state.notify);

  const comingSoon = (label: string) => () => {
    notify({
      variant: 'info',
      title: label,
      description: 'This action arrives with its module.',
    });
  };

  return (
    <DropdownMenu
      align="end"
      triggerClassName={TRIGGER_CLASS}
      trigger={
        <>
          <Icon name="plus" size="sm" />
          <span className="sr-only">Quick actions</span>
        </>
      }
      items={[
        {
          label: 'New member',
          icon: <Icon name="users" size="sm" />,
          onSelect: comingSoon('New member'),
        },
        {
          label: 'New campaign',
          icon: <Icon name="megaphone" size="sm" />,
          onSelect: comingSoon('New campaign'),
        },
        {
          label: 'New reward',
          icon: <Icon name="gift" size="sm" />,
          onSelect: comingSoon('New reward'),
        },
      ]}
    />
  );
}
