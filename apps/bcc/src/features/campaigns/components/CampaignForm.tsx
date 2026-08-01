import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button, FormField, Input, Select, Textarea, type SelectOption } from '@superdreams/ui';

import { campaignFormSchema, type CampaignFormValues } from '../validation';

const TYPE_OPTIONS: SelectOption[] = [
  { label: 'Promotional', value: 'PROMOTIONAL' },
  { label: 'Reward', value: 'REWARD' },
  { label: 'Referral', value: 'REFERRAL' },
  { label: 'Seasonal', value: 'SEASONAL' },
  { label: 'Engagement', value: 'ENGAGEMENT' },
];

const AUDIENCE_OPTIONS: SelectOption[] = [
  { label: 'All members', value: 'ALL_MEMBERS' },
  { label: 'Manual selection', value: 'MANUAL' },
  { label: 'By status', value: 'STATUS' },
  { label: 'By join date', value: 'JOIN_DATE' },
  { label: 'Segment', value: 'SEGMENT' },
];

const STATUS_OPTIONS: SelectOption[] = [
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Active', value: 'ACTIVE' },
];

const REQUIRED_STATUS_OPTIONS: SelectOption[] = [
  { label: 'No status requirement', value: '' },
  { label: 'Active members only', value: 'ACTIVE' },
  { label: 'Pending members only', value: 'PENDING' },
  { label: 'Inactive members only', value: 'INACTIVE' },
  { label: 'Suspended members only', value: 'SUSPENDED' },
];

export interface CampaignFormProps {
  defaultValues?: Partial<CampaignFormValues>;
  onSubmit: (values: CampaignFormValues) => void;
  isSubmitting: boolean;
  submitLabel: string;
  lockCode?: boolean;
  onCancel?: () => void;
}

/** Reusable campaign form (create + edit). */
export function CampaignForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel,
  lockCode = false,
  onCancel,
}: CampaignFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: { type: 'PROMOTIONAL', audienceType: 'ALL_MEMBERS', ...defaultValues },
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
          <Input {...register('code')} disabled={lockCode} placeholder="SUMMER-24" />
        </FormField>
        <FormField label="Name" required error={errors.name?.message}>
          <Input {...register('name')} />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Type" required error={errors.type?.message}>
          <Select options={TYPE_OPTIONS} {...register('type')} />
        </FormField>
        <FormField label="Audience" required error={errors.audienceType?.message}>
          <Select options={AUDIENCE_OPTIONS} {...register('audienceType')} />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Eligibility"
          hint="Optional member-status requirement."
          error={errors.requiredStatus?.message}
        >
          <Select options={REQUIRED_STATUS_OPTIONS} {...register('requiredStatus')} />
        </FormField>
        <FormField
          label="Reward points"
          hint="Points issued to each rewarded member (optional)."
          error={errors.rewardPoints?.message}
        >
          <Input
            type="number"
            min="1"
            step="1"
            {...register('rewardPoints', { valueAsNumber: true })}
          />
        </FormField>
      </div>
      {!lockCode ? (
        <FormField label="Initial status" error={errors.status?.message}>
          <Select options={STATUS_OPTIONS} {...register('status')} />
        </FormField>
      ) : null}
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
