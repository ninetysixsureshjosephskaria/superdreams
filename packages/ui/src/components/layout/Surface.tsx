import type { HTMLAttributes } from 'react';

import { cn } from '@superdreams/utils';

export type Elevation = 0 | 1 | 2 | 3;

export interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  elevation?: Elevation;
}

const elevationClass: Record<Elevation, string> = {
  0: 'shadow-none',
  1: 'shadow-sm',
  2: 'shadow',
  3: 'shadow-lg',
};

/** Elevated container surface backed by the card token. */
export function Surface({ elevation = 1, className, ...props }: SurfaceProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card text-card-foreground',
        elevationClass[elevation],
        className,
      )}
      {...props}
    />
  );
}
