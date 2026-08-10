import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@superdreams/utils';

import { Icon } from '../icons';

export interface FileUploadProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
  hint?: ReactNode;
  invalid?: boolean;
}

/** Presentational file-drop affordance wrapping a native file input. */
export const FileUpload = forwardRef<HTMLInputElement, FileUploadProps>(function FileUpload(
  { label = 'Click to upload', hint, invalid = false, className, id, disabled, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <label
      htmlFor={inputId}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-card border border-dashed border-input bg-background px-6 py-8 text-center transition-colors hover:bg-accent focus-within:ring-2 focus-within:ring-ring',
        invalid && 'border-destructive',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
    >
      <Icon name="upload" className="text-muted-foreground" />
      <span className="text-sm font-medium">{label}</span>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      <input
        ref={ref}
        id={inputId}
        type="file"
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className="sr-only"
        {...props}
      />
    </label>
  );
});
