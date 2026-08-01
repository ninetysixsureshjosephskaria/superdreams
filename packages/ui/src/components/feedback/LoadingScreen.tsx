import { Spinner } from './Spinner';

export interface LoadingScreenProps {
  message?: string;
}

/** Full-area loading state, used as the Suspense fallback for lazy routes. */
export function LoadingScreen({ message = 'Loading…' }: LoadingScreenProps) {
  return (
    <div
      className="flex min-h-[40vh] w-full flex-col items-center justify-center gap-4"
      role="status"
      aria-live="polite"
    >
      <Spinner size="lg" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
