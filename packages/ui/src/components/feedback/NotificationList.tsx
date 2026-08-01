import { cn } from '@superdreams/utils';

export type NotificationVariant = 'info' | 'success' | 'warning' | 'error';

export interface NotificationItem {
  id: string;
  variant: NotificationVariant;
  title: string;
  description?: string;
}

export interface NotificationListProps {
  notifications: NotificationItem[];
  onDismiss: (id: string) => void;
}

const variantClasses: Record<NotificationVariant, string> = {
  info: 'border-border bg-card',
  success: 'border-success/40 bg-success/10',
  warning: 'border-warning/40 bg-warning/10',
  error: 'border-destructive/40 bg-destructive/10',
};

/**
 * Presentational toast/notification list. State (the notifications and the
 * dismiss handler) is injected by the consuming app — no store coupling here.
 */
export function NotificationList({ notifications, onDismiss }: NotificationListProps) {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2"
      role="region"
      aria-label="Notifications"
    >
      {notifications.map((notification) => (
        <div
          key={notification.id}
          role="status"
          className={cn(
            'pointer-events-auto flex items-start gap-3 rounded-md border p-4 shadow-card animate-scale-in',
            variantClasses[notification.variant],
          )}
        >
          <div className="flex-1">
            <p className="text-sm font-medium">{notification.title}</p>
            {notification.description ? (
              <p className="mt-1 text-sm text-muted-foreground">{notification.description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => {
              onDismiss(notification.id);
            }}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Dismiss notification"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
