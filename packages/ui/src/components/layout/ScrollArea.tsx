import type { CSSProperties, HTMLAttributes } from 'react';

import { cn } from '@superdreams/utils';

export interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  /** Optional max height (any CSS length), enabling vertical scrolling. */
  maxHeight?: string;
}

/** Scroll container with a slim, unobtrusive scrollbar. */
export function ScrollArea({ maxHeight, className, style, ...props }: ScrollAreaProps) {
  const mergedStyle: CSSProperties = { ...style, ...(maxHeight ? { maxHeight } : {}) };
  return (
    <div
      className={cn('overflow-auto [scrollbar-width:thin]', className)}
      style={mergedStyle}
      {...props}
    />
  );
}
