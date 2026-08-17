import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@/constants';
import { Button, ContentCard, Icon } from '@superdreams/ui';

/** Member quick actions — shortcuts to the primary navigation destinations. */
export function QuickActions() {
  const navigate = useNavigate();

  return (
    <ContentCard title="Quick actions">
      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          variant="outline"
          leftIcon={<Icon name="monitor" size="sm" />}
          onClick={() => navigate(ROUTES.games)}
        >
          Play games
        </Button>
        <Button
          variant="outline"
          leftIcon={<Icon name="gift" size="sm" />}
          onClick={() => navigate(ROUTES.redemption)}
        >
          Redeem points
        </Button>
        <Button
          variant="outline"
          leftIcon={<Icon name="users" size="sm" />}
          onClick={() => navigate(ROUTES.network)}
        >
          Network
        </Button>
        <Button
          variant="outline"
          leftIcon={<Icon name="user" size="sm" />}
          onClick={() => navigate(ROUTES.profile)}
        >
          Profile
        </Button>
      </div>
    </ContentCard>
  );
}
