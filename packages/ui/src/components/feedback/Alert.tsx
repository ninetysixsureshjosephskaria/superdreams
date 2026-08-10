import type { ReactNode } from 'react';

import { cn } from '@superdreams/utils';

import { IconButton } from '../common/IconButton';
import { Icon, type IconName } from '../icons';

export type AlertVariant = 'default' | 'info' | 'success' | 'warning' | 'destructive';

export interface AlertProps {
  variant?: AlertVariant;
  title?: ReactNode;
  children?: ReactNode;
  /** Overrides the default variant icon. */
  icon?: ReactNode;
  onClose?: () => void;
  className?: string;
}

const variantMeta: Record<AlertVariant, { icon: IconName; accent: string; border: string }> = {
  default: { icon: 'info', accent: 'text-foreground', border: 'border-border' },
  info: { icon: 'info', accent: 'text-info', border: 'border-info/40' },
  success: { icon: 'check-circle', accent: 'text-success', border: 'border-success/40' },
  warning: { icon: 'alert-triangle', accent: 'text-warning', border: 'border-warning/50' },
  destructive: {
    icon: 'alert-circle',
    accent: 'text-destructive',
    border: 'border-destructive/50',
  },
};

/** Inline, contextual message. Uses `role="alert"` for assistive tech. */
export function Alert({
  variant = 'default',
  title,
  children,
  icon,
  onClose,
  className,
}: AlertProps) {
  const meta = variantMeta[variant];
  return (
    <div
      role="alert"
      className={cn(
        'flex gap-3 rounded-card border bg-card p-4 text-sm text-card-foreground',
        meta.border,
        className,
      )}
    >
      <span className={cn('mt-0.5 shrink-0', meta.accent)}>
        {icon ?? <Icon name={meta.icon} size="sm" />}
      </span>
      <div className="flex-1">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? (
          <div className={cn('text-muted-foreground', title && 'mt-1')}>{children}</div>
        ) : null}
      </div>
      {onClose ? (
        <IconButton
          label="Dismiss"
          size="sm"
          variant="ghost"
          onClick={onClose}
          className="-mr-1 -mt-1"
        >
          <Icon name="x" size="sm" />
        </IconButton>
      ) : null}
    </div>
  );
}
