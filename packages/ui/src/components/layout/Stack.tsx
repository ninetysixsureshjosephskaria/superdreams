import type { HTMLAttributes } from 'react';

import { cn } from '@superdreams/utils';

import { alignClass, gapClass, type AlignValue, type SpaceScale } from './primitives-shared';

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  gap?: SpaceScale;
  align?: AlignValue;
}

/** Vertical flex layout with token-based gap. */
export function Stack({ gap = 'md', align = 'stretch', className, ...props }: StackProps) {
  return (
    <div className={cn('flex flex-col', gapClass[gap], alignClass[align], className)} {...props} />
  );
}
