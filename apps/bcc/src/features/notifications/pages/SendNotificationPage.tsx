import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/components/page-header';
import { useNotificationStore } from '@/store';
import type { SendNotificationInput } from '@superdreams/api-client';
import {
  Alert,
  Button,
  ConfirmationDialog,
  ContentCard,
  FormField,
  Input,
  Select,
  Textarea,
  type SelectOption,
} from '@superdreams/ui';

import { useSendNotification } from '../hooks';
import { parseVariables, sendFormSchema, type SendFormValues } from '../validation';

interface PendingSend {
  input: SendNotificationInput;
  schedule: boolean;
}

/** Human summary of who a queued notification will reach, for the confirm step. */
function recipientLabel(input: SendNotificationInput): string {
  if (input.recipientMemberId) return `member ${input.recipientMemberId}`;
  if (input.recipientUserId) return `user ${input.recipientUserId}`;
  return 'the default audience';
}

const CHANNEL_OPTIONS: SelectOption[] = [
  { label: 'In-app', value: 'IN_APP' },
  { label: 'Email', value: 'EMAIL' },
  { label: 'SMS', value: 'SMS' },
  { label: 'Push', value: 'PUSH' },
];

/** Send or schedule a notification (by template or inline content). */
export default function SendNotificationPage() {
  const navigate = useNavigate();
  const notify = useNotificationStore((state) => state.notify);
  const mutation = useSendNotification();
  const [pending, setPending] = useState<PendingSend | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SendFormValues>({ resolver: zodResolver(sendFormSchema) });

  function confirmSend() {
    if (!pending || mutation.isPending) {
      return;
    }
    mutation.mutate(pending, {
      onSuccess: () => {
        notify({
          variant: 'success',
          title: pending.schedule ? 'Notification scheduled' : 'Notification queued',
        });
        navigate('/notifications');
      },
      onError: () => setPending(null),
    });
  }

  return (
    <>
      <Helmet>
        <title>Send notification</title>
      </Helmet>
      <PageHeader title="Send notification" description="Send now or schedule for later." />
      {mutation.isError ? (
        <Alert variant="destructive" title="Could not send" className="mb-4">
          {mutation.error.message}
        </Alert>
      ) : null}
      <ContentCard title="Message" className="max-w-2xl">
        <form
          noValidate
          className="space-y-4"
          onSubmit={(event) => {
            void handleSubmit((values) => {
              const scheduledAt = values.scheduledAt
                ? new Date(values.scheduledAt).toISOString()
                : undefined;
              const input: SendNotificationInput = {
                recipientMemberId: values.recipientMemberId || undefined,
                recipientUserId: values.recipientUserId || undefined,
                templateCode: values.templateCode || undefined,
                channel: values.channel,
                subject: values.subject || undefined,
                body: values.body || undefined,
                variables: parseVariables(values.variablesText),
                scheduledAt,
              };
              // Validated — confirm before it actually queues/schedules a real send.
              setPending({ input, schedule: Boolean(scheduledAt) });
            })(event);
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Recipient member id" error={errors.recipientMemberId?.message}>
              <Input {...register('recipientMemberId')} placeholder="member uuid" />
            </FormField>
            <FormField
              label="Recipient user id"
              hint="Or a user id directly."
              error={errors.recipientUserId?.message}
            >
              <Input {...register('recipientUserId')} placeholder="user uuid" />
            </FormField>
          </div>
          <FormField
            label="Template code"
            hint="Use a template, or fill channel + body below."
            error={errors.templateCode?.message}
          >
            <Input {...register('templateCode')} placeholder="WELCOME" />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Channel" error={errors.channel?.message}>
              <Select
                options={[{ label: 'Select…', value: '' }, ...CHANNEL_OPTIONS]}
                {...register('channel')}
              />
            </FormField>
            <FormField
              label="Schedule for"
              hint="Leave empty to send now."
              error={errors.scheduledAt?.message}
            >
              <Input type="datetime-local" {...register('scheduledAt')} />
            </FormField>
          </div>
          <FormField label="Subject" error={errors.subject?.message}>
            <Input {...register('subject')} />
          </FormField>
          <FormField label="Body" error={errors.body?.message}>
            <Textarea rows={4} {...register('body')} />
          </FormField>
          <FormField
            label="Variables"
            hint="key=value per line (for templates)."
            error={errors.variablesText?.message}
          >
            <Textarea
              rows={3}
              {...register('variablesText')}
              placeholder={'name=Sam\npoints=500'}
            />
          </FormField>
          <div className="flex gap-2">
            <Button type="submit">Send</Button>
            <Button type="button" variant="outline" onClick={() => navigate('/notifications')}>
              Cancel
            </Button>
          </div>
        </form>
      </ContentCard>

      <ConfirmationDialog
        isOpen={pending !== null}
        title={pending?.schedule ? 'Schedule this notification?' : 'Send this notification now?'}
        description={
          pending
            ? `This will ${pending.schedule ? 'schedule' : 'queue'} a ${pending.input.channel} notification to ${recipientLabel(pending.input)}. Recipients will receive it — this cannot be recalled once delivered.`
            : ''
        }
        confirmLabel={pending?.schedule ? 'Schedule' : 'Send now'}
        mobileSheet
        isConfirming={mutation.isPending}
        onConfirm={confirmSend}
        onCancel={() => setPending(null)}
      />
    </>
  );
}
