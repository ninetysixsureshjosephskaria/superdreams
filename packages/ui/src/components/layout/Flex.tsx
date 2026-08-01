import type { HTMLAttributes } from 'react';

import { cn } from '@superdreams/utils';

import {
  alignClass,
  gapClass,
  justifyClass,
  type AlignValue,
  type JustifyValue,
  type SpaceScale,
} from './primitives-shared';

export interface FlexProps extends HTMLAttributes<HTMLDivElement> {
  direction?: 'row' | 'col';
  gap?: SpaceScale;
  align?: AlignValue;
  justify?: JustifyValue;
  wrap?: boolean;
}

/** Flexible box with token-based gap, alignment and justification. */
export function Flex({
  direction = 'row',
  gap = 'md',
  align = 'stretch',
  justify = 'start',
  wrap = false,
  className,
  ...props
}: FlexProps) {
  return (
    <div
      className={cn(
        'flex',
        direction === 'col' ? 'flex-col' : 'flex-row',
        gapClass[gap],
        alignClass[align],
        justifyClass[justify],
        wrap && 'flex-wrap',
        className,
      )}
      {...props}
    />
  );
}
