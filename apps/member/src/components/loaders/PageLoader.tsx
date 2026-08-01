import { LoadingScreen } from '@superdreams/ui';

/** Suspense fallback for lazily-loaded routes. */
export function PageLoader() {
  return <LoadingScreen message="Loading…" />;
}
