import { ErrorState } from './ErrorState';

export interface NetworkErrorProps {
  onRetry?: () => void;
}

/** Specialized error state for connectivity failures. */
export function NetworkError({ onRetry }: NetworkErrorProps) {
  return (
    <ErrorState
      title="Connection problem"
      description="We couldn't reach the server. Check your connection and try again."
      onRetry={onRetry}
    />
  );
}
