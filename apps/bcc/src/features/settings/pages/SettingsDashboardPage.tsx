import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/components/page-header';
import { useNotificationStore } from '@/store';
import type { SettingData } from '@superdreams/api-client';
import { Alert, Button, ContentCard, Input, Select, Spinner, Switch } from '@superdreams/ui';

import { ChangePasswordCard } from '../components/ChangePasswordCard';
import { useSettingCategories, useSettings, useUpdateSettings } from '../hooks';

/** Renders a single setting as the appropriate control for its value type. */
function SettingField({
  setting,
  value,
  onChange,
}: {
  setting: SettingData;
  value: unknown;
  onChange: (value: unknown) => void;
}): JSX.Element {
  const id = `setting-${setting.key}`;
  const control = ((): JSX.Element => {
    switch (setting.valueType) {
      case 'BOOLEAN':
        return (
          <Switch
            id={id}
            checked={Boolean(value)}
            onCheckedChange={(checked) => onChange(checked)}
          />
        );
      case 'SELECT':
        return (
          <Select
            id={id}
            options={(setting.options ?? []).map((option) => ({ label: option, value: option }))}
            value={typeof value === 'string' ? value : ''}
            onChange={(event) => onChange(event.target.value)}
          />
        );
      case 'NUMBER':
        return (
          <Input
            id={id}
            type="number"
            value={typeof value === 'number' || typeof value === 'string' ? String(value) : ''}
            onChange={(event) =>
              onChange(event.target.value === '' ? '' : Number(event.target.value))
            }
          />
        );
      case 'COLOR':
        return (
          <div className="flex items-center gap-2">
            <input
              id={id}
              type="color"
              className="h-9 w-12 cursor-pointer rounded border"
              value={typeof value === 'string' && value ? value : '#000000'}
              onChange={(event) => onChange(event.target.value)}
            />
            <Input
              value={typeof value === 'string' ? value : ''}
              onChange={(event) => onChange(event.target.value)}
              className="w-32"
            />
          </div>
        );
      case 'ARRAY':
        return (
          <Input
            id={id}
            value={Array.isArray(value) ? value.join(', ') : ''}
            onChange={(event) =>
              onChange(
                event.target.value
                  .split(',')
                  .map((item) => item.trim())
                  .filter((item) => item.length > 0),
              )
            }
          />
        );
      default:
        return (
          <Input
            id={id}
            type={setting.isSecret ? 'password' : 'text'}
            placeholder={setting.isSecret && setting.hasValue ? '•••••• (set)' : ''}
            value={typeof value === 'string' ? value : ''}
            onChange={(event) => onChange(event.target.value)}
          />
        );
    }
  })();

  return (
    <div className="grid grid-cols-1 gap-1 border-b py-4 last:border-b-0 sm:grid-cols-3 sm:items-center sm:gap-4">
      <div className="sm:col-span-1">
        <label htmlFor={id} className="text-sm font-medium">
          {setting.label}
        </label>
        {setting.description ? (
          <p className="text-xs text-muted-foreground">{setting.description}</p>
        ) : null}
      </div>
      <div className="sm:col-span-2">{control}</div>
    </div>
  );
}

/** The settings dashboard: category-driven forms with search, save and reset. */
export default function SettingsDashboardPage() {
  const navigate = useNavigate();
  const notify = useNotificationStore((state) => state.notify);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<Record<string, unknown>>({});

  const categories = useSettingCategories();
  const params = search ? { search } : { category: category || undefined };
  const settings = useSettings(params);
  const update = useUpdateSettings();

  // Default to the first category once categories load.
  useEffect(() => {
    if (!category && !search && categories.data && categories.data.length > 0) {
      setCategory(categories.data[0]?.code ?? '');
    }
  }, [categories.data, category, search]);

  const changedKeys = Object.keys(draft);
  const items = settings.data ?? [];

  const categoryOptions = useMemo(
    () => (categories.data ?? []).map((c) => ({ label: c.label, value: c.code })),
    [categories.data],
  );

  const currentValue = (setting: SettingData): unknown =>
    setting.key in draft ? draft[setting.key] : setting.value;

  const onSave = (): void => {
    update.mutate(draft, {
      onSuccess: (updated) => {
        setDraft({});
        notify({
          variant: 'success',
          title: 'Settings saved',
          description: `${updated.length} setting(s) updated.`,
        });
      },
      onError: (error) =>
        notify({ variant: 'error', title: 'Could not save', description: error.message }),
    });
  };

  return (
    <>
      <Helmet>
        <title>Settings</title>
      </Helmet>
      <PageHeader
        title="Settings"
        description="Configure platform behavior."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate('/settings/feature-flags')}>
              Feature flags
            </Button>
            <Button variant="outline" onClick={() => navigate('/settings/maintenance')}>
              Maintenance
            </Button>
            <Button variant="outline" onClick={() => navigate('/settings/history')}>
              History
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-56">
          <Select
            aria-label="Category"
            options={categoryOptions}
            value={category}
            disabled={search.length > 0}
            onChange={(event) => {
              setCategory(event.target.value);
              setDraft({});
            }}
          />
        </div>
        <div className="w-64">
          <Input
            placeholder="Search all settings…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setDraft({});
            }}
          />
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" disabled={changedKeys.length === 0} onClick={() => setDraft({})}>
            Reset
          </Button>
          <Button isLoading={update.isPending} disabled={changedKeys.length === 0} onClick={onSave}>
            Save {changedKeys.length > 0 ? `(${changedKeys.length})` : ''}
          </Button>
        </div>
      </div>

      {settings.isError ? (
        <Alert variant="destructive" title="Could not load settings">
          {settings.error.message}
        </Alert>
      ) : settings.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <ContentCard title="No settings">
          <p className="py-4 text-sm text-muted-foreground">No settings match your search.</p>
        </ContentCard>
      ) : (
        <ContentCard title={search ? 'Search results' : category || 'Settings'}>
          {items.map((setting) => (
            <SettingField
              key={setting.key}
              setting={setting}
              value={currentValue(setting)}
              onChange={(value) => setDraft((prev) => ({ ...prev, [setting.key]: value }))}
            />
          ))}
        </ContentCard>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Security</h2>
        <ChangePasswordCard />
      </section>
    </>
  );
}
