import type { HTMLAttributes } from 'react';

import { cn } from '@superdreams/utils';

export interface ProgressProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role'> {
  value: number;
  max?: number;
  /** Accessible label for the progress bar. */
  label?: string;
}

/** Determinate progress bar (`role="progressbar"`). */
export function Progress({ value, max = 100, label, className, ...props }: ProgressProps) {
  const clamped = Math.min(Math.max(value, 0), max);
  const percent = max === 0 ? 0 : Math.round((clamped / max) * 100);

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-secondary', className)}
      {...props}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-normal ease-standard"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
