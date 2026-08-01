import type { ReactNode } from 'react';

import { cn } from '@superdreams/utils';

export interface AppShellProps {
  header?: ReactNode;
  sidebar?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Application frame: sticky header, optional sidebar (hidden below `md`), main
 * content and an optional footer. Layout scaffolding only — no business logic.
 */
export function AppShell({ header, sidebar, footer, children, className }: AppShellProps) {
  return (
    <div className={cn('flex min-h-screen flex-col bg-background text-foreground', className)}>
      {header ? <div className="sticky top-0 z-sticky">{header}</div> : null}
      <div className="flex flex-1">
        {sidebar ? (
          <aside className="hidden w-64 shrink-0 border-r md:block">{sidebar}</aside>
        ) : null}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      {footer}
    </div>
  );
}
