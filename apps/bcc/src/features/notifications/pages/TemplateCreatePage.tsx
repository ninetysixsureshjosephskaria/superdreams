import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/components/page-header';
import { useNotificationStore } from '@/store';
import type { CreateTemplateInput } from '@superdreams/api-client';
import { Alert } from '@superdreams/ui';

import { TemplateForm } from '../components/TemplateForm';
import { useCreateTemplate } from '../hooks';
import type { TemplateFormValues } from '../validation';

function toInput(values: TemplateFormValues): CreateTemplateInput {
  return {
    code: values.code,
    name: values.name,
    channel: values.channel,
    groupCode: values.groupCode && values.groupCode.length > 0 ? values.groupCode : undefined,
    subject: values.subject,
    body: values.body,
    status: values.status,
  };
}

/** Create a notification template. */
export default function TemplateCreatePage() {
  const navigate = useNavigate();
  const notify = useNotificationStore((state) => state.notify);
  const mutation = useCreateTemplate();

  return (
    <>
      <Helmet>
        <title>New template</title>
      </Helmet>
      <PageHeader title="New template" description="Define a reusable notification template." />
      {mutation.isError ? (
        <Alert variant="destructive" title="Could not create template" className="mb-4">
          {mutation.error.message}
        </Alert>
      ) : null}
      <TemplateForm
        submitLabel="Create template"
        isSubmitting={mutation.isPending}
        onCancel={() => navigate('/notifications/templates')}
        onSubmit={(values) => {
          mutation.mutate(toInput(values), {
            onSuccess: () => {
              notify({ variant: 'success', title: 'Template created' });
              navigate('/notifications/templates');
            },
          });
        }}
      />
    </>
  );
}
