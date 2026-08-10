import type { ReactNode } from 'react';

import { Breadcrumbs } from '@/components/breadcrumbs';

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

/** Reusable page header: breadcrumbs, title, description, and optional actions. */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 space-y-3">
      <Breadcrumbs />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-foreground sm:text-[1.7rem] sm:leading-tight">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-sm font-medium text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
