import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button, FormField, Input, Select, Textarea, type SelectOption } from '@superdreams/ui';

import { memberFormSchema, type MemberFormValues } from '../validation';

const STATUS_OPTIONS: SelectOption[] = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
  { label: 'Suspended', value: 'SUSPENDED' },
  { label: 'Archived', value: 'ARCHIVED' },
];

export interface MemberFormProps {
  defaultValues?: Partial<MemberFormValues>;
  onSubmit: (values: MemberFormValues) => void;
  isSubmitting: boolean;
  submitLabel: string;
  showStatus?: boolean;
  onCancel?: () => void;
}

/** Reusable admin member form (create + edit). Validation via Zod + RHF. */
export function MemberForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel,
  showStatus = false,
  onCancel,
}: MemberFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MemberFormValues>({ resolver: zodResolver(memberFormSchema), defaultValues });

  return (
    <form
      noValidate
      className="max-w-2xl space-y-4"
      onSubmit={(event) => {
        void handleSubmit(onSubmit)(event);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="First name" required error={errors.firstName?.message}>
          <Input {...register('firstName')} />
        </FormField>
        <FormField label="Last name" required error={errors.lastName?.message}>
          <Input {...register('lastName')} />
        </FormField>
      </div>
      <FormField label="Email" required error={errors.email?.message}>
        <Input type="email" {...register('email')} />
      </FormField>
      <FormField label="Phone" hint="Optional. E.g. +15551234567" error={errors.phone?.message}>
        <Input {...register('phone')} />
      </FormField>
      {showStatus ? (
        <FormField label="Status" error={errors.status?.message}>
          <Select options={STATUS_OPTIONS} {...register('status')} />
        </FormField>
      ) : null}
      <FormField label="Bio" error={errors.bio?.message}>
        <Textarea rows={3} {...register('bio')} />
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
