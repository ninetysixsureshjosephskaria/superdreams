import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button, FormField, Input, Select, Textarea, type SelectOption } from '@superdreams/ui';

import {
  allocateFormSchema,
  redeemFormSchema,
  rewardAdjustFormSchema,
  type AllocateFormValues,
  type RedeemFormValues,
  type RewardAdjustFormValues,
} from '../validation';

const DIRECTION_OPTIONS: SelectOption[] = [
  { label: 'Credit (add points)', value: 'CREDIT' },
  { label: 'Debit (remove points)', value: 'DEBIT' },
];

export function AllocateForm({
  isSubmitting,
  onSubmit,
}: {
  isSubmitting: boolean;
  onSubmit: (values: AllocateFormValues) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AllocateFormValues>({ resolver: zodResolver(allocateFormSchema) });

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
      <FormField label="Points" required error={errors.points?.message}>
        <Input type="number" min="1" step="1" {...register('points', { valueAsNumber: true })} />
      </FormField>
      <FormField label="Description" error={errors.description?.message}>
        <Input {...register('description')} />
      </FormField>
      <Button type="submit" isLoading={isSubmitting}>
        Earn points
      </Button>
    </form>
  );
}

export function RedeemForm({
  isSubmitting,
  onSubmit,
}: {
  isSubmitting: boolean;
  onSubmit: (values: RedeemFormValues) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RedeemFormValues>({ resolver: zodResolver(redeemFormSchema) });

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
      <FormField label="Points" required error={errors.points?.message}>
        <Input type="number" min="1" step="1" {...register('points', { valueAsNumber: true })} />
      </FormField>
      <FormField label="Note" error={errors.note?.message}>
        <Input {...register('note')} />
      </FormField>
      <Button type="submit" isLoading={isSubmitting}>
        Redeem points
      </Button>
    </form>
  );
}

export function RewardAdjustForm({
  isSubmitting,
  onSubmit,
}: {
  isSubmitting: boolean;
  onSubmit: (values: RewardAdjustFormValues) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RewardAdjustFormValues>({
    resolver: zodResolver(rewardAdjustFormSchema),
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
      <FormField label="Points" required error={errors.points?.message}>
        <Input type="number" min="1" step="1" {...register('points', { valueAsNumber: true })} />
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
