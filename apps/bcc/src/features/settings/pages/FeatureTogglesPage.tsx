import { useState } from 'react';
import { Helmet } from 'react-helmet-async';

import { PageHeader } from '@/components/page-header';
import { useNotificationStore } from '@/store';
import { Alert, Button, ContentCard, Input, Spinner, Switch } from '@superdreams/ui';

import { useCreateFeatureToggle, useFeatureToggles, useUpdateFeatureToggle } from '../hooks';

/** Feature flags: list, toggle and create feature toggles. */
export default function FeatureTogglesPage() {
  const notify = useNotificationStore((state) => state.notify);
  const toggles = useFeatureToggles();
  const create = useCreateFeatureToggle();
  const update = useUpdateFeatureToggle();
  const [key, setKey] = useState('');
  const [name, setName] = useState('');

  return (
    <>
      <Helmet>
        <title>Feature flags</title>
      </Helmet>
      <PageHeader title="Feature flags" description="Enable or disable platform features." />

      <ContentCard title="New feature flag" className="mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-56">
            <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="fkey">
              Key
            </label>
            <Input
              id="fkey"
              placeholder="module.feature"
              value={key}
              onChange={(event) => setKey(event.target.value)}
            />
          </div>
          <div className="w-56">
            <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="fname">
              Name
            </label>
            <Input
              id="fname"
              placeholder="Feature name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <Button
            isLoading={create.isPending}
            disabled={key.trim().length === 0 || name.trim().length === 0}
            onClick={() => {
              create.mutate(
                { key: key.trim(), name: name.trim(), enabled: false },
                {
                  onSuccess: () => {
                    setKey('');
                    setName('');
                    notify({ variant: 'success', title: 'Feature flag created' });
                  },
                  onError: (error) =>
                    notify({
                      variant: 'error',
                      title: 'Could not create',
                      description: error.message,
                    }),
                },
              );
            }}
          >
            Create
          </Button>
        </div>
      </ContentCard>

      {toggles.isError ? (
        <Alert variant="destructive" title="Could not load feature flags">
          {toggles.error.message}
        </Alert>
      ) : toggles.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <ContentCard title="Feature flags">
          {toggles.data.map((toggle) => (
            <div
              key={toggle.id}
              className="flex items-center justify-between border-b py-3 last:border-b-0"
            >
              <div>
                <p className="text-sm font-medium">{toggle.name}</p>
                <p className="text-xs text-muted-foreground">
                  {toggle.key}
                  {toggle.description ? ` — ${toggle.description}` : ''}
                </p>
              </div>
              <Switch
                checked={toggle.enabled}
                onCheckedChange={(enabled) => {
                  update.mutate(
                    { id: toggle.id, input: { enabled } },
                    {
                      onSuccess: () =>
                        notify({
                          variant: 'success',
                          title: enabled ? 'Enabled' : 'Disabled',
                          description: toggle.name,
                        }),
                    },
                  );
                }}
              />
            </div>
          ))}
        </ContentCard>
      )}
    </>
  );
}
