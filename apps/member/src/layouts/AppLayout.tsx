import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import { NotificationContainer } from '@/components/feedback';
import { AppFooter } from '@/components/footer';
import { AppHeader } from '@/components/header';
import { PageLoader } from '@/components/loaders';
import { BottomNav, MoreDrawer } from '@/components/mobile-nav';
import { SidebarNav } from '@/components/sidebar';
import { SkipLink } from '@/components/skip-link';

/**
 * Primary member layout: skip link, sticky header, desktop sidebar, mobile
 * bottom navigation (+ "more" drawer), routed content, and footer. Member
 * features plug into the `Outlet` without touching this shell.
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
            className="flex-1 p-4 pb-20 focus-visible:outline-none sm:p-6 md:pb-6"
          >
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </main>
          <AppFooter />
        </div>
      </div>
      <BottomNav />
      <MoreDrawer />
      <NotificationContainer />
    </div>
  );
}
