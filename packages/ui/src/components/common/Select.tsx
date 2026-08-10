import { forwardRef, type SelectHTMLAttributes } from 'react';

import { cn } from '@superdreams/utils';

import { Icon } from '../icons';
import type { InputSize } from './Input';

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'size' | 'children'
> {
  options: SelectOption[];
  placeholder?: string;
  invalid?: boolean;
  selectSize?: InputSize;
}

const sizeClasses: Record<InputSize, string> = {
  sm: 'h-8 text-sm',
  md: 'h-10 text-sm',
  lg: 'h-11 text-base',
};

/** Styled native `<select>` with a token-driven chevron. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    options,
    placeholder,
    invalid = false,
    selectSize = 'md',
    className,
    'aria-invalid': ariaInvalid,
    ...props
  },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={ariaInvalid ?? (invalid || undefined)}
        className={cn(
          'flex w-full appearance-none rounded-control border border-input bg-background pl-3 pr-9 shadow-input transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
          sizeClasses[selectSize],
          invalid && 'border-destructive focus-visible:ring-destructive',
          className,
        )}
        {...props}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      <Icon
        name="chevron-down"
        size="sm"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
});
