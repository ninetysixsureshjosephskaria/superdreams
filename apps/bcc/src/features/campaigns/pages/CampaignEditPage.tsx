import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';

import { PageHeader } from '@/components/page-header';
import { useNotificationStore } from '@/store';
import type { UpdateCampaignInput } from '@superdreams/api-client';
import { Alert, Button, LoadingScreen } from '@superdreams/ui';

import { CampaignForm } from '../components/CampaignForm';
import { useCampaign, useUpdateCampaign } from '../hooks';
import type { CampaignFormValues } from '../validation';

function toUpdateInput(values: CampaignFormValues): UpdateCampaignInput {
  return {
    name: values.name,
    description: values.description ?? null,
    audienceType: values.audienceType,
    rules:
      values.requiredStatus && values.requiredStatus.length > 0
        ? [{ type: 'MEMBER_STATUS', value: values.requiredStatus }]
        : [],
    reward: values.rewardPoints
      ? { points: values.rewardPoints, description: 'Campaign reward' }
      : null,
  };
}

/** Edit a campaign (code and type are immutable). */
export default function CampaignEditPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const notify = useNotificationStore((state) => state.notify);
  const campaignQuery = useCampaign(id);
  const mutation = useUpdateCampaign(id);

  if (campaignQuery.isPending) {
    return <LoadingScreen message="Loading campaign…" />;
  }
  if (campaignQuery.isError || !campaignQuery.data) {
    return (
      <Alert variant="destructive" title="Could not load campaign">
        <div className="space-y-3">
          <p>{campaignQuery.error?.message ?? 'The campaign could not be found.'}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void campaignQuery.refetch();
            }}
          >
            Try again
          </Button>
        </div>
      </Alert>
    );
  }

  const campaign = campaignQuery.data;
  const requiredStatus = campaign.rules.find((rule) => rule.type === 'MEMBER_STATUS')?.value ?? '';

  return (
    <>
      <Helmet>
        <title>Edit {campaign.name}</title>
      </Helmet>
      <PageHeader title={`Edit ${campaign.name}`} description="Update the campaign details." />
      {mutation.isError ? (
        <Alert variant="destructive" title="Could not update campaign" className="mb-4">
          {mutation.error.message}
        </Alert>
      ) : null}
      <CampaignForm
        lockCode
        submitLabel="Save changes"
        isSubmitting={mutation.isPending}
        defaultValues={{
          code: campaign.code,
          name: campaign.name,
          type: campaign.type,
          audienceType: campaign.audienceType,
          description: campaign.description ?? undefined,
          requiredStatus: requiredStatus as CampaignFormValues['requiredStatus'],
          rewardPoints: campaign.reward?.points,
        }}
        onCancel={() => navigate(`/campaigns/${campaign.id}`)}
        onSubmit={(values) => {
          mutation.mutate(toUpdateInput(values), {
            onSuccess: () => {
              notify({ variant: 'success', title: 'Campaign updated' });
              navigate(`/campaigns/${campaign.id}`);
            },
          });
        }}
      />
    </>
  );
}
