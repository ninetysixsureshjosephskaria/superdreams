import { useState, type FormEvent } from 'react';
import { Helmet } from 'react-helmet-async';

import { PageHeader } from '@/components/page-header';
import { useNotificationStore } from '@/store';
import type { RedemptionRequestStatus } from '@superdreams/api-client';
import {
  Alert,
  Badge,
  Button,
  ContentCard,
  FormField,
  Input,
  LoadingScreen,
  StatCard,
  Textarea,
  type BadgeVariant,
} from '@superdreams/ui';

import { useMyBalance, useMyRedemption, useSubmitRedemption } from '../hooks';

const STATUS_VARIANT: Record<RedemptionRequestStatus, BadgeVariant> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
};

/**
 * Member points-redemption request experience (P2): view the points balance,
 * submit a request for a number of points (with an optional note), and see the
 * current request's status. Points are debited only when an admin approves — no
 * points are held while a request is PENDING.
 */
export default function RedemptionPage(): JSX.Element {
  const notify = useNotificationStore((state) => state.notify);
  const balance = useMyBalance();
  const mine = useMyRedemption();
  const submit = useSubmitRedemption();

  const [points, setPoints] = useState('');
  const [note, setNote] = useState('');

  const current = mine.data ?? null;
  const hasPending = current?.status === 'PENDING';

  const handleSubmit = (event: FormEvent): void => {
    event.preventDefault();
    const amount = Number(points);
    if (!Number.isInteger(amount) || amount < 1) {
      notify({
        variant: 'error',
        title: 'Enter a valid amount',
        description: 'Points must be a whole number of at least 1.',
      });
      return;
    }
    submit.mutate(
      { pointsRequested: amount, note: note.trim() ? note.trim() : undefined },
      {
        onSuccess: (request) => {
          notify({
            variant: 'success',
            title: 'Request submitted',
            description: `Your request to redeem ${request.pointsRequested.toLocaleString()} points is pending review.`,
          });
          setPoints('');
          setNote('');
        },
        onError: (error) => {
          notify({
            variant: 'error',
            title: 'Could not submit request',
            description: error.message,
          });
        },
      },
    );
  };

  if (balance.isLoading || mine.isLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Helmet>
        <title>Redeem points · Super Dreams</title>
      </Helmet>
      <PageHeader
        title="Redeem points"
        description="Request to redeem your points. An admin reviews each request."
      />

      <div className="grid gap-4">
        <StatCard
          label="Points balance"
          value={(balance.data?.pointsBalance ?? 0).toLocaleString()}
        />

        {current ? (
          <ContentCard title="Your latest request">
            <div className="flex flex-wrap items-center gap-3">
              <Badge soft variant={STATUS_VARIANT[current.status]}>
                {current.status}
              </Badge>
              <span className="tabular-nums font-medium">
                {current.pointsRequested.toLocaleString()} points
              </span>
            </div>
            {current.note ? (
              <p className="mt-2 text-sm text-muted-foreground">Note: {current.note}</p>
            ) : null}
            {current.status === 'REJECTED' && current.decisionReason ? (
              <p className="mt-2 text-sm text-muted-foreground">Reason: {current.decisionReason}</p>
            ) : null}
            {current.status === 'PENDING' ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Awaiting admin review. No points are deducted until it is approved.
              </p>
            ) : null}
          </ContentCard>
        ) : null}

        <ContentCard title="Request a redemption">
          {hasPending ? (
            <Alert variant="info" title="You already have a pending request">
              You can submit a new request once your current one is decided.
            </Alert>
          ) : (
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <FormField label="Points to redeem" required>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={points}
                  onChange={(event) => setPoints(event.target.value)}
                  placeholder="e.g. 500"
                />
              </FormField>
              <FormField label="Note (optional)">
                <Textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Add a reason for this redemption (optional)"
                />
              </FormField>
              <div>
                <Button type="submit" isLoading={submit.isPending}>
                  Submit request
                </Button>
              </div>
            </form>
          )}
        </ContentCard>
      </div>
    </>
  );
}
