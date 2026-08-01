import type { ReactNode } from 'react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../common';

export interface ContentCardProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/** Titled card composition: header (title/description/actions), body, footer. */
export function ContentCard({
  title,
  description,
  actions,
  footer,
  children,
  className,
}: ContentCardProps) {
  return (
    <Card className={className}>
      {title || description || actions ? (
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              {title ? <CardTitle>{title}</CardTitle> : null}
              {description ? <CardDescription>{description}</CardDescription> : null}
            </div>
            {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
          </div>
        </CardHeader>
      ) : null}
      {children ? <CardContent>{children}</CardContent> : null}
      {footer ? <CardFooter className="justify-end gap-2">{footer}</CardFooter> : null}
    </Card>
  );
}
