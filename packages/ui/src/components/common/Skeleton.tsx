import type { HTMLAttributes } from 'react';

import { cn } from '@superdreams/utils';

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

/** Animated placeholder for loading content. Decorative (hidden from a11y tree). */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}
