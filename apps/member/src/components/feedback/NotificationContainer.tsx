import { useNotificationStore } from '@/store';
import { NotificationList } from '@superdreams/ui';

/** App notification wrapper: binds the notification store to the shared list. */
export function NotificationContainer() {
  const notifications = useNotificationStore((state) => state.notifications);
  const dismiss = useNotificationStore((state) => state.dismiss);

  return <NotificationList notifications={notifications} onDismiss={dismiss} />;
}
