import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import { NotificationContainer } from '@/components/feedback';
import { AppFooter } from '@/components/footer';
import { AppHeader } from '@/components/header';
import { PageLoader } from '@/components/loaders';
import { MobileNav, SidebarNav } from '@/components/sidebar';
import { SkipLink } from '@/components/skip-link';

/**
 * Primary admin layout: skip link, sticky header, collapsible desktop sidebar
 * (mobile drawer), routed content area, and footer. Business modules plug into
 * the `Outlet` without touching this shell.
 */
export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SkipLink />
      <AppHeader />
      <div className="flex flex-1">
        <SidebarNav />
        <div className="flex min-w-0 flex-1 flex-col">
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 p-4 focus-visible:outline-none sm:p-6"
          >
            {/* Centered admin workspace: comfortable max-width on ultrawide while
                wide data tables can still scroll within their own container. */}
            <div className="mx-auto w-full max-w-[1440px]">
              <Suspense fallback={<PageLoader />}>
                <Outlet />
              </Suspense>
            </div>
          </main>
          <AppFooter />
        </div>
      </div>
      <MobileNav />
      <NotificationContainer />
    </div>
  );
}
