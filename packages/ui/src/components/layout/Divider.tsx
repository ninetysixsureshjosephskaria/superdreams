import type { ReactNode } from 'react';

import { cn } from '@superdreams/utils';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  label?: ReactNode;
  className?: string;
}

/** Visual separator. Supports an optional centered label (horizontal only). */
export function Divider({ orientation = 'horizontal', label, className }: DividerProps) {
  if (orientation === 'vertical') {
    return (
      <span
        role="separator"
        aria-orientation="vertical"
        className={cn('inline-block w-px self-stretch bg-border', className)}
      />
    );
  }

  if (label) {
    return (
      <div className={cn('flex items-center gap-3', className)} role="separator">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
    );
  }

  return <hr className={cn('border-0 border-t border-border', className)} />;
}
