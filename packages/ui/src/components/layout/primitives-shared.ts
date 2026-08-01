/** Shared scale + alignment maps for the layout primitives. */

export type SpaceScale = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export const gapClass: Record<SpaceScale, string> = {
  none: 'gap-0',
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
};

export type AlignValue = 'start' | 'center' | 'end' | 'stretch' | 'baseline';

export const alignClass: Record<AlignValue, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
};

export type JustifyValue = 'start' | 'center' | 'end' | 'between' | 'around';

export const justifyClass: Record<JustifyValue, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
};
