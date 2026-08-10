import type { ReactNode } from 'react';

import { Icon, type IconName } from '@superdreams/ui';

export interface SectionHeadingProps {
  title: string;
  /** Optional leading icon rendered in a teal-tinted chip. */
  icon?: IconName;
  /** Optional trailing content (e.g. a "See all" link or filter). */
  action?: ReactNode;
  className?: string;
}

/**
 * Super Dreams section header (`.sec`): a muted, uppercase group label with an
 * optional teal-tinted icon chip and a trailing action slot.
 */
export function SectionHeading({ title, icon, action, className }: SectionHeadingProps) {
  return (
    <div className={`mb-3 mt-1 flex items-center justify-between gap-3 ${className ?? ''}`}>
      <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        {icon ? (
          <span
            aria-hidden="true"
            className="grid h-6 w-6 place-items-center rounded-lg bg-accent text-primary"
          >
            <Icon name={icon} size="xs" />
          </span>
        ) : null}
        {title}
      </h2>
      {action ? <div className="flex items-center gap-2">{action}</div> : null}
    </div>
  );
}
