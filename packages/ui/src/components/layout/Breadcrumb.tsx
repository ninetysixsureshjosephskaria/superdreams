import type { ReactNode } from 'react';

export interface BreadcrumbProps {
  /** Breadcrumb items (`<li>`) supplied by the app, which owns routing. */
  children: ReactNode;
}

/**
 * Breadcrumb shell: an accessible `nav`/`ol` structure. The trail items
 * (router links + segments) are injected by the consuming app.
 */
export function Breadcrumb({ children }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-2">{children}</ol>
    </nav>
  );
}
