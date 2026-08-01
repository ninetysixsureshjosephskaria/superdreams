import { Link } from 'react-router-dom';

import { useBreadcrumbs } from '@/hooks';
import { Breadcrumb, Icon } from '@superdreams/ui';

/** Config-aware breadcrumbs derived from the current route. */
export function Breadcrumbs() {
  const crumbs = useBreadcrumbs();

  return (
    <Breadcrumb>
      {crumbs.map((crumb, index) => (
        <li key={crumb.path} className="flex items-center gap-2">
          {index > 0 ? (
            <Icon name="chevron-right" size="xs" className="text-muted-foreground/60" />
          ) : null}
          {crumb.isCurrent ? (
            <span aria-current="page" className="font-medium text-foreground">
              {crumb.label}
            </span>
          ) : (
            <Link to={crumb.path} className="transition-colors hover:text-foreground">
              {crumb.label}
            </Link>
          )}
        </li>
      ))}
    </Breadcrumb>
  );
}
