import type { HTMLAttributes } from 'react';

import { cn } from '@superdreams/utils';

export type BadgeVariant =
  'default' | 'secondary' | 'success' | 'warning' | 'info' | 'destructive' | 'outline';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  /**
   * Soft-tint treatment (tinted background + colored text) instead of the solid
   * fill — the Super Dreams `.ipill` status-pill look. Opt-in; the default solid
   * rendering is unchanged.
   */
  soft?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'border-transparent bg-primary text-primary-foreground',
  secondary: 'border-transparent bg-secondary text-secondary-foreground',
  success: 'border-transparent bg-success text-success-foreground',
  warning: 'border-transparent bg-warning text-warning-foreground',
  info: 'border-transparent bg-info text-info-foreground',
  destructive: 'border-transparent bg-destructive text-destructive-foreground',
  outline: 'border-border text-foreground',
};

const softClasses: Record<BadgeVariant, string> = {
  default: 'border-transparent bg-primary/12 text-primary',
  secondary: 'border-transparent bg-muted text-muted-foreground',
  success: 'border-transparent bg-success/15 text-success',
  warning: 'border-transparent bg-warning/15 text-warning',
  info: 'border-transparent bg-info/15 text-info',
  destructive: 'border-transparent bg-destructive/15 text-destructive',
  outline: 'border-border text-foreground',
};

/** Small status/label pill. Pass `soft` for the tinted status-pill treatment. */
export function Badge({ variant = 'default', soft = false, className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        (soft ? softClasses : variantClasses)[variant],
        className,
      )}
      {...props}
    />
  );
}
