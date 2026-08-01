import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/components/page-header';
import { useNotificationStore } from '@/store';
import type { CreateRewardProgramInput } from '@superdreams/api-client';
import { Alert } from '@superdreams/ui';

import { ProgramForm } from '../components/ProgramForm';
import { useCreateProgram } from '../hooks';
import type { ProgramFormValues } from '../validation';

function toInput(values: ProgramFormValues): CreateRewardProgramInput {
  return {
    code: values.code,
    name: values.name,
    type: values.type,
    description: values.description,
    categoryCode: values.categoryCode,
    status: values.status,
  };
}

/** Create a reward program. */
export default function ProgramCreatePage() {
  const navigate = useNavigate();
  const notify = useNotificationStore((state) => state.notify);
  const mutation = useCreateProgram();

  return (
    <>
      <Helmet>
        <title>New reward program</title>
      </Helmet>
      <PageHeader title="New reward program" description="Define how members earn points." />
      {mutation.isError ? (
        <Alert variant="destructive" title="Could not create program" className="mb-4">
          {mutation.error.message}
        </Alert>
      ) : null}
      <ProgramForm
        submitLabel="Create program"
        isSubmitting={mutation.isPending}
        onCancel={() => navigate('/rewards')}
        onSubmit={(values) => {
          mutation.mutate(toInput(values), {
            onSuccess: (program) => {
              notify({ variant: 'success', title: 'Program created' });
              navigate(`/rewards/programs/${program.id}`);
            },
          });
        }}
      />
    </>
  );
}
