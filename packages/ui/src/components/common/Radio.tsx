import { useId, type ReactNode } from 'react';

import { cn } from '@superdreams/utils';

export interface RadioOption {
  label: ReactNode;
  value: string;
  description?: ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  /** Controlled selected value. Omit for uncontrolled usage. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  label?: ReactNode;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
}

/** Accessible radio group. Controlled via `value`/`onChange` or uncontrolled. */
export function RadioGroup({
  name,
  options,
  value,
  defaultValue,
  onChange,
  label,
  invalid = false,
  disabled = false,
  className,
}: RadioGroupProps) {
  const groupId = useId();
  const isControlled = value !== undefined;

  return (
    <div
      role="radiogroup"
      aria-labelledby={label ? `${groupId}-label` : undefined}
      aria-invalid={invalid || undefined}
      className={cn('grid gap-2', className)}
    >
      {label ? (
        <span id={`${groupId}-label`} className="text-sm font-medium">
          {label}
        </span>
      ) : null}
      {options.map((option) => {
        const optionId = `${groupId}-${option.value}`;
        const descriptionId = option.description ? `${optionId}-description` : undefined;
        return (
          <div key={option.value} className="flex items-start gap-2">
            <span className="relative inline-flex h-4 w-4 items-center justify-center">
              <input
                id={optionId}
                type="radio"
                name={name}
                value={option.value}
                disabled={disabled || option.disabled}
                aria-describedby={descriptionId}
                {...(isControlled
                  ? { checked: value === option.value }
                  : { defaultChecked: defaultValue === option.value })}
                onChange={(event) => {
                  if (event.target.checked) {
                    onChange?.(option.value);
                  }
                }}
                className="peer h-4 w-4 shrink-0 appearance-none rounded-full border border-input bg-background transition-colors checked:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
              />
              <span className="pointer-events-none absolute h-2 w-2 rounded-full bg-primary opacity-0 peer-checked:opacity-100" />
            </span>
            <div className="grid gap-0.5 leading-none">
              <label htmlFor={optionId} className="text-sm font-medium">
                {option.label}
              </label>
              {option.description ? (
                <p id={descriptionId} className="text-xs text-muted-foreground">
                  {option.description}
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
