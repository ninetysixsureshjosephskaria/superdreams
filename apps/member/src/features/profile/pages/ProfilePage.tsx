import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';

import { PageHeader } from '@/components/page-header';
import { useNotificationStore } from '@/store';
import type { MemberDetail, MemberStatus, UpdateOwnProfileInput } from '@superdreams/api-client';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  ContentCard,
  FormField,
  Input,
  LoadingScreen,
  Textarea,
  type BadgeVariant,
} from '@superdreams/ui';

import { useMyProfile, useUpdateMyProfile } from '../hooks';
import { profileFormSchema, type ProfileFormValues } from '../validation';

const statusVariant: Record<MemberStatus, BadgeVariant> = {
  ACTIVE: 'success',
  PENDING: 'warning',
  INACTIVE: 'secondary',
  SUSPENDED: 'destructive',
  ARCHIVED: 'outline',
};

function statusLabel(status: MemberStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || '—'}</p>
    </div>
  );
}

function ViewCard({ member }: { member: MemberDetail }) {
  return (
    <ContentCard title="Personal information">
      <div className="grid grid-cols-2 gap-4">
        <Field label="First name" value={member.firstName} />
        <Field label="Last name" value={member.lastName} />
        <Field label="Email" value={member.email} />
        <Field label="Phone" value={member.phone ?? ''} />
      </div>
      {member.profile?.bio ? (
        <p className="mt-4 text-sm text-muted-foreground">{member.profile.bio}</p>
      ) : null}
      {member.addresses.length > 0 ? (
        <div className="mt-4 space-y-1 text-sm">
          {member.addresses.map((address) => (
            <p key={address.id}>
              {address.line1}, {address.city}, {address.country}
            </p>
          ))}
        </div>
      ) : null}
    </ContentCard>
  );
}

function EditCard({ member, onDone }: { member: MemberDetail; onDone: () => void }) {
  const mutation = useUpdateMyProfile();
  const notify = useNotificationStore((state) => state.notify);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: member.firstName,
      lastName: member.lastName,
      phone: member.phone ?? '',
      bio: member.profile?.bio ?? '',
    },
  });

  return (
    <ContentCard title="Edit profile">
      {mutation.isError ? (
        <Alert variant="destructive" title="Update failed" className="mb-4">
          {mutation.error.message}
        </Alert>
      ) : null}
      <form
        noValidate
        className="space-y-4"
        onSubmit={(event) => {
          void handleSubmit((values) => {
            const input: UpdateOwnProfileInput = {
              firstName: values.firstName,
              lastName: values.lastName,
              phone: values.phone ? values.phone : null,
              profile: { bio: values.bio ?? '' },
            };
            mutation.mutate(input, {
              onSuccess: () => {
                notify({ variant: 'success', title: 'Profile updated' });
                onDone();
              },
            });
          })(event);
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="First name" required error={errors.firstName?.message}>
            <Input {...register('firstName')} />
          </FormField>
          <FormField label="Last name" required error={errors.lastName?.message}>
            <Input {...register('lastName')} />
          </FormField>
        </div>
        <FormField label="Phone" error={errors.phone?.message}>
          <Input {...register('phone')} />
        </FormField>
        <FormField label="Bio" error={errors.bio?.message}>
          <Textarea rows={3} {...register('bio')} />
        </FormField>
        <div className="flex gap-2">
          <Button type="submit" isLoading={mutation.isPending}>
            Save changes
          </Button>
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </form>
    </ContentCard>
  );
}

/** Member self-service profile: view personal info + edit permitted fields. */
export default function ProfilePage() {
  const query = useMyProfile();
  const [editing, setEditing] = useState(false);

  if (query.isPending) {
    return <LoadingScreen message="Loading your profile…" />;
  }
  if (query.isError || !query.data) {
    return (
      <>
        <PageHeader title="My profile" />
        <Alert variant="destructive" title="Could not load your profile">
          {query.error?.message ?? 'Please try again later.'}
        </Alert>
      </>
    );
  }

  const member = query.data;

  return (
    <>
      <Helmet>
        <title>My profile</title>
      </Helmet>
      <PageHeader
        title="My profile"
        description="View and update your personal information."
        actions={
          editing ? undefined : (
            <Button variant="outline" onClick={() => setEditing(true)}>
              Edit profile
            </Button>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <ContentCard className="lg:col-span-1">
          <div className="flex flex-col items-center gap-3 text-center">
            <Avatar name={member.fullName} size="xl" src={member.profile?.avatarUrl ?? undefined} />
            <div>
              <p className="text-lg font-semibold">{member.fullName}</p>
              <p className="text-sm text-muted-foreground">{member.memberNumber}</p>
            </div>
            <Badge variant={statusVariant[member.status]}>{statusLabel(member.status)}</Badge>
            <p className="text-xs text-muted-foreground">
              Joined {new Date(member.joinedAt).toLocaleDateString()}
            </p>
          </div>
        </ContentCard>
        <div className="lg:col-span-2">
          {editing ? (
            <EditCard
              member={member}
              onDone={() => {
                setEditing(false);
              }}
            />
          ) : (
            <ViewCard member={member} />
          )}
        </div>
      </div>
    </>
  );
}
