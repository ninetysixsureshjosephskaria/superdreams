import type { AriaRole, ReactNode } from 'react';

import { Button } from '../common/Button';
import { Icon, type IconName } from '../icons';

interface FullPageStateProps {
  icon: IconName;
  code?: string;
  title: string;
  description: string;
  action?: ReactNode;
  role?: AriaRole;
}

function FullPageState({ icon, code, title, description, action, role }: FullPageStateProps) {
  return (
    <div
      role={role}
      className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 p-8 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon name={icon} size="lg" />
      </div>
      {code ? <p className="text-sm font-medium text-muted-foreground">{code}</p> : null}
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export interface ErrorScreenProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  action?: ReactNode;
}

/** Full-page error state with an optional retry. */
export function ErrorScreen({
  title = 'Something went wrong',
  description = 'An unexpected error occurred. Please try again.',
  onRetry,
  action,
}: ErrorScreenProps) {
  return (
    <FullPageState
      role="alert"
      icon="alert-triangle"
      title={title}
      description={description}
      action={
        action ??
        (onRetry ? (
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        ) : null)
      }
    />
  );
}

export interface UnauthorizedScreenProps {
  title?: string;
  description?: string;
  action?: ReactNode;
}

/** Full-page 403 / access-denied state. */
export function UnauthorizedScreen({
  title = 'Access denied',
  description = 'You do not have permission to view this page.',
  action,
}: UnauthorizedScreenProps) {
  return (
    <FullPageState
      icon="x-circle"
      code="403"
      title={title}
      description={description}
      action={action}
    />
  );
}

export interface NotFoundScreenProps {
  title?: string;
  description?: string;
  action?: ReactNode;
}

/** Full-page 404 state. */
export function NotFoundScreen({
  title = 'Page not found',
  description = 'The page you are looking for does not exist or has moved.',
  action,
}: NotFoundScreenProps) {
  return (
    <FullPageState
      icon="search"
      code="404"
      title={title}
      description={description}
      action={action}
    />
  );
}
