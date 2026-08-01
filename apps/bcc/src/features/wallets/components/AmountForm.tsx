import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button, FormField, Input } from '@superdreams/ui';

import { amountFormSchema, type AmountFormValues } from '../validation';

export interface AmountFormProps {
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (values: AmountFormValues) => void;
  withDescription?: boolean;
}

/** Reusable amount form for credit and debit actions (amount in major units). */
export function AmountForm({
  submitLabel,
  isSubmitting,
  onSubmit,
  withDescription = true,
}: AmountFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AmountFormValues>({ resolver: zodResolver(amountFormSchema) });

  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={(event) => {
        void handleSubmit((values) => {
          onSubmit(values);
          reset();
        })(event);
      }}
    >
      <FormField label="Amount" required error={errors.amount?.message}>
        <Input type="number" step="0.01" min="0" {...register('amount', { valueAsNumber: true })} />
      </FormField>
      {withDescription ? (
        <FormField label="Description" error={errors.description?.message}>
          <Input {...register('description')} />
        </FormField>
      ) : null}
      <Button type="submit" isLoading={isSubmitting}>
        {submitLabel}
      </Button>
    </form>
  );
}
