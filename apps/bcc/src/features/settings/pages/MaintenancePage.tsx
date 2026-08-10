import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';

import { PageHeader } from '@/components/page-header';
import { useNotificationStore } from '@/store';
import {
  Alert,
  Badge,
  Button,
  ConfirmationDialog,
  ContentCard,
  Input,
  Spinner,
  Switch,
  Textarea,
} from '@superdreams/ui';

import { useMaintenance, useSetMaintenance } from '../hooks';

/** Maintenance mode: view current status and enable/disable with a message. */
export default function MaintenancePage() {
  const notify = useNotificationStore((state) => state.notify);
  const status = useMaintenance();
  const setMaintenance = useSetMaintenance();

  const [title, setTitle] = useState('Scheduled maintenance');
  const [message, setMessage] = useState('The platform is undergoing maintenance.');
  const [confirmEnable, setConfirmEnable] = useState(false);

  const active = status.data?.active ?? false;

  // Prefill from the active window if one exists.
  useEffect(() => {
    if (status.data?.window) {
      setTitle(status.data.window.title);
      setMessage(status.data.window.message);
    }
  }, [status.data?.window]);

  function applyMaintenance(enabled: boolean) {
    setMaintenance.mutate(enabled ? { enabled: true, title, message } : { enabled: false }, {
      onSuccess: () =>
        notify({
          variant: 'success',
          title: enabled ? 'Maintenance enabled' : 'Maintenance disabled',
        }),
      onError: (error) => notify({ variant: 'error', title: 'Failed', description: error.message }),
      onSettled: () => setConfirmEnable(false),
    });
  }

  return (
    <>
      <Helmet>
        <title>Maintenance mode</title>
      </Helmet>
      <PageHeader
        title="Maintenance mode"
        description="Take the platform offline for maintenance."
      />

      {status.isError ? (
        <Alert variant="destructive" title="Could not load maintenance status">
          <div className="space-y-3">
            <p>{status.error.message}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void status.refetch();
              }}
            >
              Try again
            </Button>
          </div>
        </Alert>
      ) : status.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <ContentCard
          title="Status"
          description={active ? 'Maintenance mode is currently ON.' : 'Maintenance mode is OFF.'}
        >
          <div className="mb-4 flex items-center gap-3">
            <Badge soft variant={active ? 'warning' : 'secondary'}>
              {active ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          <div className="space-y-4">
            <div>
              <label
                className="mb-1 block text-xs font-medium text-muted-foreground"
                htmlFor="mtitle"
              >
                Title
              </label>
              <Input id="mtitle" value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div>
              <label
                className="mb-1 block text-xs font-medium text-muted-foreground"
                htmlFor="mmsg"
              >
                Message
              </label>
              <Textarea
                id="mmsg"
                rows={3}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </div>

            <div className="flex items-center justify-between rounded-surface border p-4">
              <div>
                <p className="text-sm font-medium">Maintenance mode</p>
                <p className="text-xs text-muted-foreground">
                  Toggle to enable or disable maintenance.
                </p>
              </div>
              <Switch
                checked={active}
                disabled={setMaintenance.isPending}
                onCheckedChange={(enabled) => {
                  // Enabling takes the whole platform offline — confirm first.
                  // Disabling restores service and is applied immediately.
                  if (enabled) {
                    setConfirmEnable(true);
                  } else {
                    applyMaintenance(false);
                  }
                }}
              />
            </div>
          </div>
        </ContentCard>
      )}

      <ConfirmationDialog
        isOpen={confirmEnable}
        title="Take the platform offline?"
        description="Enabling maintenance mode immediately blocks members from signing in and using the platform until you turn it back off. Admins keep access."
        confirmLabel="Enable maintenance"
        tone="destructive"
        mobileSheet
        isConfirming={setMaintenance.isPending}
        onConfirm={() => applyMaintenance(true)}
        onCancel={() => setConfirmEnable(false)}
      />
    </>
  );
}
