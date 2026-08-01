import { forwardRef, type InputHTMLAttributes } from 'react';

import { cn } from '@superdreams/utils';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Applies error styling and sets `aria-invalid`. */
  invalid?: boolean;
  /** Control height (kept separate from the native numeric `size` attribute). */
  inputSize?: InputSize;
}

const sizeClasses: Record<InputSize, string> = {
  sm: 'h-8 text-sm',
  md: 'h-10 text-sm',
  lg: 'h-11 text-base',
};

/** Presentational text input styled with design tokens. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    className,
    type = 'text',
    invalid = false,
    inputSize = 'md',
    'aria-invalid': ariaInvalid,
    ...props
  },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      aria-invalid={ariaInvalid ?? (invalid || undefined)}
      className={cn(
        'flex w-full rounded-md border border-input bg-background px-3 py-2 shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
        sizeClasses[inputSize],
        invalid && 'border-destructive focus-visible:ring-destructive',
        className,
      )}
      {...props}
    />
  );
});
