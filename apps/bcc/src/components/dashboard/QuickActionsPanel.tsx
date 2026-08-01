import { useNotificationStore } from '@/store';
import { Button, ContentCard, Icon } from '@superdreams/ui';

/** Dashboard quick-actions panel. Actions are mocked (they arrive with modules). */
export function QuickActionsPanel() {
  const notify = useNotificationStore((state) => state.notify);
  const act = (label: string) => () => {
    notify({ variant: 'info', title: label, description: 'This action arrives with its module.' });
  };

  return (
    <ContentCard title="Quick actions">
      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          variant="outline"
          leftIcon={<Icon name="users" size="sm" />}
          onClick={act('New member')}
        >
          New member
        </Button>
        <Button
          variant="outline"
          leftIcon={<Icon name="megaphone" size="sm" />}
          onClick={act('New campaign')}
        >
          New campaign
        </Button>
        <Button
          variant="outline"
          leftIcon={<Icon name="gift" size="sm" />}
          onClick={act('New reward')}
        >
          New reward
        </Button>
        <Button
          variant="outline"
          leftIcon={<Icon name="bar-chart" size="sm" />}
          onClick={act('New report')}
        >
          New report
        </Button>
      </div>
    </ContentCard>
  );
}
