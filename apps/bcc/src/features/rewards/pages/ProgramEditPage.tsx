import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';

import { PageHeader } from '@/components/page-header';
import { useNotificationStore } from '@/store';
import type { UpdateRewardProgramInput } from '@superdreams/api-client';
import { Alert, Button, LoadingScreen } from '@superdreams/ui';

import { ProgramForm } from '../components/ProgramForm';
import { useProgram, useUpdateProgram } from '../hooks';
import type { ProgramFormValues } from '../validation';

function toInput(values: ProgramFormValues): UpdateRewardProgramInput {
  return {
    name: values.name,
    description: values.description ?? null,
    categoryCode: values.categoryCode ?? null,
  };
}

/** Edit a reward program (code and type are immutable). */
export default function ProgramEditPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const notify = useNotificationStore((state) => state.notify);
  const programQuery = useProgram(id);
  const mutation = useUpdateProgram(id);

  if (programQuery.isPending) {
    return <LoadingScreen message="Loading program…" />;
  }
  if (programQuery.isError || !programQuery.data) {
    return (
      <Alert variant="destructive" title="Could not load program">
        <div className="space-y-3">
          <p>{programQuery.error?.message ?? 'The program could not be found.'}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void programQuery.refetch();
            }}
          >
            Try again
          </Button>
        </div>
      </Alert>
    );
  }

  const program = programQuery.data;

  return (
    <>
      <Helmet>
        <title>Edit {program.name}</title>
      </Helmet>
      <PageHeader title={`Edit ${program.name}`} description="Update the program details." />
      {mutation.isError ? (
        <Alert variant="destructive" title="Could not update program" className="mb-4">
          {mutation.error.message}
        </Alert>
      ) : null}
      <ProgramForm
        lockCode
        submitLabel="Save changes"
        isSubmitting={mutation.isPending}
        defaultValues={{
          code: program.code,
          name: program.name,
          type: program.type,
          description: program.description ?? undefined,
          categoryCode:
            (program.categoryCode as ProgramFormValues['categoryCode'] | null) ?? undefined,
        }}
        onCancel={() => navigate(`/rewards/programs/${program.id}`)}
        onSubmit={(values) => {
          mutation.mutate(toInput(values), {
            onSuccess: () => {
              notify({ variant: 'success', title: 'Program updated' });
              navigate(`/rewards/programs/${program.id}`);
            },
          });
        }}
      />
    </>
  );
}
