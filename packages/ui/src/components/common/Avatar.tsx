import { useState, type ImgHTMLAttributes } from 'react';

import { cn } from '@superdreams/utils';

import { Icon } from '../icons';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'size'> {
  src?: string;
  /** Used to derive initials and the accessible label when no `alt` is given. */
  name?: string;
  size?: AvatarSize;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'h-6 w-6 text-[0.625rem]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join('');
}

/** User avatar with graceful fallback to initials, then a generic icon. */
export function Avatar({ src, name, size = 'md', alt, className, ...props }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const label = alt ?? name ?? 'User avatar';
  const showImage = src && !failed;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted font-medium text-muted-foreground',
        sizeClasses[size],
        className,
      )}
      role="img"
      aria-label={label}
    >
      {showImage ? (
        <img
          src={src}
          alt={label}
          className="h-full w-full object-cover"
          onError={() => {
            setFailed(true);
          }}
          {...props}
        />
      ) : name ? (
        <span aria-hidden="true">{initials(name)}</span>
      ) : (
        <Icon name="user" size="sm" aria-hidden="true" />
      )}
    </span>
  );
}
