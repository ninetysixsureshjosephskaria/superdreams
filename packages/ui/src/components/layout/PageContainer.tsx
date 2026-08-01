import type { ReactNode } from 'react';

import { cn } from '@superdreams/utils';

export interface PageContainerProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Standard page content wrapper: constrains width and renders an optional page
 * heading. The document title is owned by the application (via Helmet), not by
 * this UI package.
 */
export function PageContainer({
  title,
  description,
  actions,
  children,
  className,
}: PageContainerProps) {
  const hasHeader = Boolean(title) || Boolean(actions);

  return (
    <section className={cn('mx-auto w-full max-w-7xl', className)}>
      {hasHeader ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            {title ? <h1 className="text-2xl font-bold tracking-tight">{title}</h1> : null}
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
