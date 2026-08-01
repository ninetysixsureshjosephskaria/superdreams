import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button, FormField, Input, Select, Textarea, type SelectOption } from '@superdreams/ui';

import { templateFormSchema, type TemplateFormValues } from '../validation';

const CHANNEL_OPTIONS: SelectOption[] = [
  { label: 'In-app', value: 'IN_APP' },
  { label: 'Email', value: 'EMAIL' },
  { label: 'SMS', value: 'SMS' },
  { label: 'Push', value: 'PUSH' },
];

const GROUP_OPTIONS: SelectOption[] = [
  { label: 'No group', value: '' },
  { label: 'System', value: 'SYSTEM' },
  { label: 'Account', value: 'ACCOUNT' },
  { label: 'Rewards', value: 'REWARDS' },
  { label: 'Campaigns', value: 'CAMPAIGNS' },
  { label: 'Wallet', value: 'WALLET' },
];

const STATUS_OPTIONS: SelectOption[] = [
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
];

export interface TemplateFormProps {
  defaultValues?: Partial<TemplateFormValues>;
  onSubmit: (values: TemplateFormValues) => void;
  isSubmitting: boolean;
  submitLabel: string;
  lockCode?: boolean;
  onCancel?: () => void;
}

/** Reusable notification template form. Use `{{variable}}` in subject/body. */
export function TemplateForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel,
  lockCode = false,
  onCancel,
}: TemplateFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: { channel: 'IN_APP', status: 'DRAFT', ...defaultValues },
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
        <FormField label="Channel" required error={errors.channel?.message}>
          <Select options={CHANNEL_OPTIONS} {...register('channel')} disabled={lockCode} />
        </FormField>
        <FormField label="Group" error={errors.groupCode?.message}>
          <Select options={GROUP_OPTIONS} {...register('groupCode')} />
        </FormField>
        <FormField label="Status" error={errors.status?.message}>
          <Select options={STATUS_OPTIONS} {...register('status')} />
        </FormField>
      </div>
      <FormField
        label="Subject"
        hint="Optional. Supports {{variables}}."
        error={errors.subject?.message}
      >
        <Input {...register('subject')} />
      </FormField>
      <FormField label="Body" required hint="Supports {{variables}}." error={errors.body?.message}>
        <Textarea rows={5} {...register('body')} />
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
