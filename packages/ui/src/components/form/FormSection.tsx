import type { ReactNode } from 'react';

import { cn } from '@superdreams/utils';

export interface FormSectionProps {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Groups related fields under an accessible legend. */
export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <fieldset className={cn('space-y-4 border-0 p-0', className)}>
      {title ? <legend className="text-base font-semibold">{title}</legend> : null}
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}
