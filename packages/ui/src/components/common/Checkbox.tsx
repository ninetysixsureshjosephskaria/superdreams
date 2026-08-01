import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@superdreams/utils';

import { Icon } from '../icons';

export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'size'
> {
  label?: ReactNode;
  description?: ReactNode;
  invalid?: boolean;
}

/** Accessible checkbox with an optional label and description. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, description, invalid = false, className, id, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const descriptionId = description ? `${inputId}-description` : undefined;

  return (
    <div className="flex items-start gap-2">
      <span className="relative inline-flex h-4 w-4 items-center justify-center">
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          aria-invalid={invalid || undefined}
          aria-describedby={descriptionId}
          className={cn(
            'peer h-4 w-4 shrink-0 appearance-none rounded border border-input bg-background transition-colors checked:border-primary checked:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
            invalid && 'border-destructive',
            className,
          )}
          {...props}
        />
        <Icon
          name="check"
          className="pointer-events-none absolute hidden h-3 w-3 text-primary-foreground peer-checked:block"
        />
      </span>
      {label || description ? (
        <div className="grid gap-0.5 leading-none">
          {label ? (
            <label htmlFor={inputId} className="text-sm font-medium">
              {label}
            </label>
          ) : null}
          {description ? (
            <p id={descriptionId} className="text-xs text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
