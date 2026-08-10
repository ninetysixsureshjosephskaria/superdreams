import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';

import { PageHeader } from '@/components/page-header';
import { useNotificationStore } from '@/store';
import type { UpdateMemberInput } from '@superdreams/api-client';
import { Alert, Button, LoadingScreen } from '@superdreams/ui';

import { MemberForm } from '../components/MemberForm';
import { useMember, useUpdateMember } from '../hooks';
import type { MemberFormValues } from '../validation';

function toUpdateInput(values: MemberFormValues): UpdateMemberInput {
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    email: values.email,
    phone: values.phone ? values.phone : null,
    profile: { bio: values.bio ?? '' },
  };
}

/** Edit a member. */
export default function MemberEditPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const notify = useNotificationStore((state) => state.notify);
  const memberQuery = useMember(id);
  const mutation = useUpdateMember(id);

  if (memberQuery.isPending) {
    return <LoadingScreen message="Loading member…" />;
  }
  if (memberQuery.isError || !memberQuery.data) {
    return (
      <Alert variant="destructive" title="Could not load member">
        <div className="space-y-3">
          <p>{memberQuery.error?.message ?? 'The member could not be found.'}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void memberQuery.refetch();
            }}
          >
            Try again
          </Button>
        </div>
      </Alert>
    );
  }

  const member = memberQuery.data;
  const defaultValues: Partial<MemberFormValues> = {
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    phone: member.phone ?? '',
    status: member.status,
    bio: member.profile?.bio ?? '',
  };

  return (
    <>
      <Helmet>
        <title>Edit {member.fullName}</title>
      </Helmet>
      <PageHeader title={`Edit ${member.fullName}`} description="Update the member's details." />
      {mutation.isError ? (
        <Alert variant="destructive" title="Could not update member" className="mb-4">
          {mutation.error.message}
        </Alert>
      ) : null}
      <MemberForm
        defaultValues={defaultValues}
        submitLabel="Save changes"
        isSubmitting={mutation.isPending}
        onCancel={() => navigate(`/members/${member.id}`)}
        onSubmit={(values) => {
          mutation.mutate(toUpdateInput(values), {
            onSuccess: () => {
              notify({ variant: 'success', title: 'Member updated' });
              navigate(`/members/${member.id}`);
            },
          });
        }}
      />
    </>
  );
}
