import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';

import { cn } from '@superdreams/utils';

import { Label } from './Label';

export interface FormFieldProps {
  label?: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  /** Override the generated control id. */
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Wires a label, help text and error message to a single control, injecting
 * `id`, `aria-invalid` and `aria-describedby` when the child is an element.
 * Pairs naturally with React Hook Form (pass `fieldState.error?.message`).
 */
export function FormField({
  label,
  required = false,
  hint,
  error,
  htmlFor,
  className,
  children,
}: FormFieldProps) {
  const autoId = useId();
  const fieldId = htmlFor ?? autoId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id: (children as ReactElement<Record<string, unknown>>).props.id ?? fieldId,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })
    : children;

  return (
    <div className={cn('grid gap-1.5', className)}>
      {label ? (
        <Label htmlFor={fieldId} required={required}>
          {label}
        </Label>
      ) : null}
      {control}
      {hint && !error ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
