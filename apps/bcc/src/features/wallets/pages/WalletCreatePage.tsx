import { zodResolver } from '@hookform/resolvers/zod';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/components/page-header';
import { useNotificationStore } from '@/store';
import { Alert, Button, FormField, Input, Select, type SelectOption } from '@superdreams/ui';

import { useCreateWallet } from '../hooks';
import { createWalletSchema, type CreateWalletValues } from '../validation';

const STATUS_OPTIONS: SelectOption[] = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'Active', value: 'ACTIVE' },
];

/** Create a wallet for a member. */
export default function WalletCreatePage() {
  const navigate = useNavigate();
  const notify = useNotificationStore((state) => state.notify);
  const mutation = useCreateWallet();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateWalletValues>({
    resolver: zodResolver(createWalletSchema),
    defaultValues: { currencyCode: 'USD', status: 'ACTIVE' },
  });

  return (
    <>
      <Helmet>
        <title>New wallet</title>
      </Helmet>
      <PageHeader title="New wallet" description="Open a wallet for a member." />
      {mutation.isError ? (
        <Alert variant="destructive" title="Could not create wallet" className="mb-4">
          {mutation.error.message}
        </Alert>
      ) : null}
      <form
        noValidate
        className="max-w-xl space-y-4"
        onSubmit={(event) => {
          void handleSubmit((values) => {
            mutation.mutate(values, {
              onSuccess: (wallet) => {
                notify({ variant: 'success', title: 'Wallet created' });
                navigate(`/wallet/${wallet.id}`);
              },
            });
          })(event);
        }}
      >
        <FormField
          label="Member id"
          required
          hint="The member who will own this wallet."
          error={errors.memberId?.message}
        >
          <Input {...register('memberId')} placeholder="00000000-0000-0000-0000-000000000000" />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Currency" required error={errors.currencyCode?.message}>
            <Input {...register('currencyCode')} maxLength={3} />
          </FormField>
          <FormField label="Initial status" error={errors.status?.message}>
            <Select options={STATUS_OPTIONS} {...register('status')} />
          </FormField>
        </div>
        <div className="flex gap-2">
          <Button type="submit" isLoading={mutation.isPending}>
            Create wallet
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/wallet')}>
            Cancel
          </Button>
        </div>
      </form>
    </>
  );
}
