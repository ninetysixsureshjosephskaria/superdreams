import type { ReactNode } from 'react';
import {
  FormProvider,
  type FieldValues,
  type SubmitHandler,
  type UseFormReturn,
} from 'react-hook-form';

export interface FormProps<TValues extends FieldValues> {
  form: UseFormReturn<TValues>;
  onSubmit: SubmitHandler<TValues>;
  children: ReactNode;
  className?: string;
}

/**
 * Reusable form wrapper: provides the RHF context and wires submit handling.
 * Pairs with `useZodForm` for schema-validated forms.
 */
export function Form<TValues extends FieldValues>({
  form,
  onSubmit,
  children,
  className,
}: FormProps<TValues>) {
  return (
    <FormProvider {...form}>
      <form
        onSubmit={(event) => {
          void form.handleSubmit(onSubmit)(event);
        }}
        className={className}
        noValidate
      >
        {children}
      </form>
    </FormProvider>
  );
}

export interface FieldErrorProps {
  message?: string;
}

/** Accessible inline field error message. */
export function FieldError({ message }: FieldErrorProps) {
  if (!message) {
    return null;
  }
  return (
    <p role="alert" className="mt-1 text-sm text-destructive">
      {message}
    </p>
  );
}
