import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/components/page-header';
import { useNotificationStore } from '@/store';
import type { CreateMemberInput } from '@superdreams/api-client';
import { Alert } from '@superdreams/ui';

import { MemberForm } from '../components/MemberForm';
import { useCreateMember } from '../hooks';
import type { MemberFormValues } from '../validation';

function toCreateInput(values: MemberFormValues): CreateMemberInput {
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    email: values.email,
    phone: values.phone || undefined,
    status: values.status,
    profile: values.bio ? { bio: values.bio } : undefined,
  };
}

/** Create a member. */
export default function MemberCreatePage() {
  const navigate = useNavigate();
  const notify = useNotificationStore((state) => state.notify);
  const mutation = useCreateMember();

  return (
    <>
      <Helmet>
        <title>New member</title>
      </Helmet>
      <PageHeader title="New member" description="Create a member record." />
      {mutation.isError ? (
        <Alert variant="destructive" title="Could not create member" className="mb-4">
          {mutation.error.message}
        </Alert>
      ) : null}
      <MemberForm
        submitLabel="Create member"
        isSubmitting={mutation.isPending}
        showStatus
        onCancel={() => navigate('/members')}
        onSubmit={(values) => {
          mutation.mutate(toCreateInput(values), {
            onSuccess: (member) => {
              notify({
                variant: 'success',
                title: 'Member created',
                description: `${member.fullName} was created.`,
              });
              navigate(`/members/${member.id}`);
            },
          });
        }}
      />
    </>
  );
}
