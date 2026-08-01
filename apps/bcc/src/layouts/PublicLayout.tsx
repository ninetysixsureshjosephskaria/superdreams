import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import { LoadingScreen } from '@superdreams/ui';

/** Simple centered layout for public/standalone pages. */
export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-foreground">
      <main className="w-full max-w-md">
        <Suspense fallback={<LoadingScreen />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
