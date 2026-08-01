import type { HTMLAttributes } from 'react';

import { cn } from '@superdreams/utils';

import { gapClass, type SpaceScale } from './primitives-shared';

export type GridColumns = 1 | 2 | 3 | 4 | 6 | 12;

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  cols?: GridColumns;
  gap?: SpaceScale;
}

const colsClass: Record<GridColumns, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  12: 'grid-cols-12',
};

/** Responsive, mobile-first grid. */
export function Grid({ cols = 1, gap = 'md', className, ...props }: GridProps) {
  return <div className={cn('grid', colsClass[cols], gapClass[gap], className)} {...props} />;
}
