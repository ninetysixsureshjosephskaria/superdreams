import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button, FormField, Input, Select, Textarea, type SelectOption } from '@superdreams/ui';

import { adjustmentFormSchema, type AdjustmentFormValues } from '../validation';

const DIRECTION_OPTIONS: SelectOption[] = [
  { label: 'Credit (increase)', value: 'CREDIT' },
  { label: 'Debit (decrease)', value: 'DEBIT' },
];

export interface AdjustmentFormProps {
  isSubmitting: boolean;
  onSubmit: (values: AdjustmentFormValues) => void;
}

/** Manual balance adjustment form (direction + amount + reason). */
export function AdjustmentForm({ isSubmitting, onSubmit }: AdjustmentFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentFormSchema),
    defaultValues: { direction: 'CREDIT' },
  });

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
      <FormField label="Direction" required error={errors.direction?.message}>
        <Select options={DIRECTION_OPTIONS} {...register('direction')} />
      </FormField>
      <FormField label="Amount" required error={errors.amount?.message}>
        <Input type="number" step="0.01" min="0" {...register('amount', { valueAsNumber: true })} />
      </FormField>
      <FormField label="Reason" required error={errors.reason?.message}>
        <Textarea rows={2} {...register('reason')} />
      </FormField>
      <Button type="submit" isLoading={isSubmitting}>
        Post adjustment
      </Button>
    </form>
  );
}
