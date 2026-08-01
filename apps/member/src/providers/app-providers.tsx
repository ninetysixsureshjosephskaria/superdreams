import type { ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { HelmetProvider } from 'react-helmet-async';

import { AppErrorFallback } from '@superdreams/ui';

import { QueryProvider } from './query-provider';
import { ThemeProvider } from './theme-provider';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Composes all global providers:
 * Helmet (document head) -> Theme -> Error boundary -> Query (server state).
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <ErrorBoundary FallbackComponent={AppErrorFallback}>
          <QueryProvider>{children}</QueryProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </HelmetProvider>
  );
}
