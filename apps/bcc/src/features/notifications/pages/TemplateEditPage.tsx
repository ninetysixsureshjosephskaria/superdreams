import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';

import { PageHeader } from '@/components/page-header';
import { useNotificationStore } from '@/store';
import type { TemplatePreview, UpdateTemplateInput } from '@superdreams/api-client';
import { Alert, Button, ContentCard, LoadingScreen, Textarea } from '@superdreams/ui';

import { notificationsApi } from '../api';
import { TemplateForm } from '../components/TemplateForm';
import { useTemplate, useUpdateTemplate } from '../hooks';
import { parseVariables, type TemplateFormValues } from '../validation';

function toInput(values: TemplateFormValues): UpdateTemplateInput {
  return {
    name: values.name,
    groupCode: values.groupCode && values.groupCode.length > 0 ? values.groupCode : null,
    subject: values.subject ?? null,
    body: values.body,
    status: values.status,
  };
}

/** Edit a notification template with a live preview. */
export default function TemplateEditPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const notify = useNotificationStore((state) => state.notify);
  const templateQuery = useTemplate(id);
  const mutation = useUpdateTemplate(id);

  const [variablesText, setVariablesText] = useState('');
  const [preview, setPreview] = useState<TemplatePreview | null>(null);
  const [previewing, setPreviewing] = useState(false);

  if (templateQuery.isPending) {
    return <LoadingScreen message="Loading template…" />;
  }
  if (templateQuery.isError || !templateQuery.data) {
    return (
      <Alert variant="destructive" title="Could not load template">
        {templateQuery.error?.message ?? 'The template could not be found.'}
      </Alert>
    );
  }

  const template = templateQuery.data;
  const runPreview = async (): Promise<void> => {
    setPreviewing(true);
    try {
      setPreview(await notificationsApi.previewTemplate(id, parseVariables(variablesText)));
    } catch (error) {
      notify({
        variant: 'error',
        title: 'Preview failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Edit {template.name}</title>
      </Helmet>
      <PageHeader
        title={`Edit ${template.name}`}
        description={`${template.code} · revision ${template.revision}`}
      />
      {mutation.isError ? (
        <Alert variant="destructive" title="Could not update template" className="mb-4">
          {mutation.error.message}
        </Alert>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <TemplateForm
          lockCode
          submitLabel="Save changes"
          isSubmitting={mutation.isPending}
          defaultValues={{
            code: template.code,
            name: template.name,
            channel: template.channel,
            groupCode: (template.groupCode as TemplateFormValues['groupCode']) ?? '',
            subject: template.subject ?? undefined,
            body: template.body,
            status: template.status,
          }}
          onCancel={() => navigate('/notifications/templates')}
          onSubmit={(values) => {
            mutation.mutate(toInput(values), {
              onSuccess: () => {
                notify({ variant: 'success', title: 'Template updated' });
                navigate('/notifications/templates');
              },
            });
          }}
        />
        <ContentCard title="Preview">
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Variables: {template.variables.length > 0 ? template.variables.join(', ') : 'none'}
            </p>
            <Textarea
              rows={4}
              aria-label="Preview variables"
              placeholder={'name=Sam\npoints=500'}
              value={variablesText}
              onChange={(event) => setVariablesText(event.target.value)}
            />
            <Button variant="outline" isLoading={previewing} onClick={() => void runPreview()}>
              Render preview
            </Button>
            {preview ? (
              <div className="rounded-md border p-3 text-sm">
                {preview.subject ? <p className="font-medium">{preview.subject}</p> : null}
                <p className="whitespace-pre-wrap text-muted-foreground">{preview.body}</p>
                {preview.missingVariables.length > 0 ? (
                  <p className="mt-2 text-xs text-warning-foreground">
                    Missing: {preview.missingVariables.join(', ')}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </ContentCard>
      </div>
    </>
  );
}
