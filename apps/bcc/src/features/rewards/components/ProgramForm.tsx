import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button, FormField, Input, Select, Textarea, type SelectOption } from '@superdreams/ui';

import { programFormSchema, type ProgramFormValues } from '../validation';

const TYPE_OPTIONS: SelectOption[] = [
  { label: 'Fixed', value: 'FIXED' },
  { label: 'Percentage', value: 'PERCENTAGE' },
  { label: 'Tier-based', value: 'TIER' },
  { label: 'Event-triggered', value: 'EVENT' },
  { label: 'Manual', value: 'MANUAL' },
  { label: 'Promotional', value: 'PROMOTIONAL' },
];

const CATEGORY_OPTIONS: SelectOption[] = [
  { label: 'General', value: 'GENERAL' },
  { label: 'Promotional', value: 'PROMOTIONAL' },
  { label: 'Seasonal', value: 'SEASONAL' },
  { label: 'Loyalty', value: 'LOYALTY' },
];

const STATUS_OPTIONS: SelectOption[] = [
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Active', value: 'ACTIVE' },
];

export interface ProgramFormProps {
  defaultValues?: Partial<ProgramFormValues>;
  onSubmit: (values: ProgramFormValues) => void;
  isSubmitting: boolean;
  submitLabel: string;
  /** Code is immutable on edit. */
  lockCode?: boolean;
  onCancel?: () => void;
}

/** Reusable reward program form (create + edit). */
export function ProgramForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel,
  lockCode = false,
  onCancel,
}: ProgramFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProgramFormValues>({
    resolver: zodResolver(programFormSchema),
    defaultValues: { type: 'FIXED', ...defaultValues },
  });

  return (
    <form
      noValidate
      className="max-w-2xl space-y-4"
      onSubmit={(event) => {
        void handleSubmit(onSubmit)(event);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Code" required error={errors.code?.message}>
          <Input {...register('code')} disabled={lockCode} placeholder="WELCOME" />
        </FormField>
        <FormField label="Name" required error={errors.name?.message}>
          <Input {...register('name')} />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Type" required error={errors.type?.message}>
          <Select options={TYPE_OPTIONS} {...register('type')} />
        </FormField>
        <FormField label="Category" error={errors.categoryCode?.message}>
          <Select options={CATEGORY_OPTIONS} {...register('categoryCode')} />
        </FormField>
        {!lockCode ? (
          <FormField label="Initial status" error={errors.status?.message}>
            <Select options={STATUS_OPTIONS} {...register('status')} />
          </FormField>
        ) : null}
      </div>
      <FormField label="Description" error={errors.description?.message}>
        <Textarea rows={3} {...register('description')} />
      </FormField>
      <div className="flex gap-2">
        <Button type="submit" isLoading={isSubmitting}>
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
