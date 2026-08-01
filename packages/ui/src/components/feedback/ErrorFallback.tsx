import type { FallbackProps } from 'react-error-boundary';

import { Button } from '../common';

/**
 * Top-level fallback UI for the global error boundary. Shown when a render error
 * escapes to the application root.
 */
export function AppErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const message = error instanceof Error ? error.message : 'An unexpected error occurred.';

  return (
    <div
      role="alert"
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center text-foreground"
    >
      <div className="max-w-md space-y-2">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          The application encountered an unexpected error.
        </p>
        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">{message}</p>
      </div>
      <Button onClick={resetErrorBoundary}>Reload view</Button>
    </div>
  );
}
