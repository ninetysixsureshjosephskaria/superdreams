import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/components/page-header';
import { useNotificationStore } from '@/store';
import type { CreateCampaignInput } from '@superdreams/api-client';
import { Alert } from '@superdreams/ui';

import { CampaignForm } from '../components/CampaignForm';
import { useCreateCampaign } from '../hooks';
import type { CampaignFormValues } from '../validation';

function toCreateInput(values: CampaignFormValues): CreateCampaignInput {
  return {
    code: values.code,
    name: values.name,
    type: values.type,
    audienceType: values.audienceType,
    description: values.description,
    status: values.status,
    rules:
      values.requiredStatus && values.requiredStatus.length > 0
        ? [{ type: 'MEMBER_STATUS', value: values.requiredStatus }]
        : undefined,
    reward: values.rewardPoints
      ? { points: values.rewardPoints, description: 'Campaign reward' }
      : undefined,
  };
}

/** Create a campaign. */
export default function CampaignCreatePage() {
  const navigate = useNavigate();
  const notify = useNotificationStore((state) => state.notify);
  const mutation = useCreateCampaign();

  return (
    <>
      <Helmet>
        <title>New campaign</title>
      </Helmet>
      <PageHeader title="New campaign" description="Define a member campaign." />
      {mutation.isError ? (
        <Alert variant="destructive" title="Could not create campaign" className="mb-4">
          {mutation.error.message}
        </Alert>
      ) : null}
      <CampaignForm
        submitLabel="Create campaign"
        isSubmitting={mutation.isPending}
        onCancel={() => navigate('/campaigns')}
        onSubmit={(values) => {
          mutation.mutate(toCreateInput(values), {
            onSuccess: (campaign) => {
              notify({ variant: 'success', title: 'Campaign created' });
              navigate(`/campaigns/${campaign.id}`);
            },
          });
        }}
      />
    </>
  );
}
