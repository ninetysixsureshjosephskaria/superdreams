import type { SVGProps } from 'react';

import { cn } from '@superdreams/utils';

import { ICON_CONTENT, type IconName } from './icon-paths';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const sizePx: Record<IconSize, number> = { xs: 14, sm: 16, md: 20, lg: 24, xl: 32 };

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  /** Preset size keyword or an explicit pixel value. */
  size?: IconSize | number;
  /** When set, the icon is exposed to assistive tech with this label. */
  title?: string;
}

/**
 * Consistent icon renderer. Icons inherit `currentColor` and get a uniform
 * stroke; decorative by default (`aria-hidden`) unless a `title` is provided.
 */
export function Icon({ name, size = 'md', title, className, ...props }: IconProps) {
  const dimension = typeof size === 'number' ? size : sizePx[size];
  return (
    <svg
      width={dimension}
      height={dimension}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('inline-block shrink-0', className)}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {ICON_CONTENT[name]}
    </svg>
  );
}
